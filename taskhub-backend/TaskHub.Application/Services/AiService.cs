using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class AiService : IAiService
{
    private readonly IMongoRepository<Project> _projectRepository;
    private readonly IMongoRepository<TaskItem> _taskRepository;
    private readonly IMongoRepository<Comment> _commentRepository;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    // Giới hạn dữ liệu đưa vào prompt để kiểm soát chi phí token.
    private const int MaxTasks = 100;
    private const int MaxComments = 40;

    // Model miễn phí của Google Gemini (free tier).
    private const string GeminiModel = "gemini-2.0-flash";

    private const string SystemInstruction =
        "Bạn là trợ lý quản lý dự án của TaskHub. Hãy tóm tắt tình hình dự án bằng tiếng Việt, " +
        "giọng văn chuyên nghiệp, ngắn gọn và dễ đọc. Trình bày theo các mục: " +
        "**Tổng quan tiến độ**, **Đang tắc/Rủi ro**, **Việc quá hạn**, và **Đề xuất tiếp theo**. " +
        "Chỉ dựa trên dữ liệu được cung cấp, không bịa thông tin. Dùng markdown với gạch đầu dòng khi phù hợp.";

    public AiService(
        IMongoRepository<Project> projectRepository,
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Comment> commentRepository,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _projectRepository = projectRepository;
        _taskRepository = taskRepository;
        _commentRepository = commentRepository;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<string?> SummarizeProjectAsync(string projectId, string userId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(userId))
        {
            return null;
        }

        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return null;
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isMember)
        {
            return null;
        }

        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Gemini API key chưa được cấu hình (Gemini:ApiKey).");
        }

        var allTasks = await _taskRepository.GetAllAsync();
        var tasks = allTasks
            .Where(t => t.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .Take(MaxTasks)
            .ToList();

        var taskIds = tasks.Select(t => t.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var allComments = await _commentRepository.GetAllAsync();
        var comments = allComments
            .Where(c => taskIds.Contains(c.TaskId))
            .OrderByDescending(c => c.CreatedAt)
            .Take(MaxComments)
            .ToList();

        var prompt = BuildPrompt(project, tasks, comments);

        var requestBody = new
        {
            system_instruction = new { parts = new[] { new { text = SystemInstruction } } },
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            },
            generationConfig = new { maxOutputTokens = 2000, temperature = 0.4 }
        };

        // Key truyền qua query string theo chuẩn REST của Gemini.
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{GeminiModel}:generateContent?key={apiKey}";

        var http = _httpClientFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(60);

        using var resp = await http.PostAsJsonAsync(url, requestBody);
        resp.EnsureSuccessStatusCode();

        using var stream = await resp.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);

        var text = ExtractText(doc.RootElement);
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static string ExtractText(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            return string.Empty;
        }

        var first = candidates[0];
        if (!first.TryGetProperty("content", out var content) ||
            !content.TryGetProperty("parts", out var parts))
        {
            return string.Empty;
        }

        var sb = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var t))
            {
                sb.Append(t.GetString());
            }
        }
        return sb.ToString();
    }

    private static string BuildPrompt(Project project, List<TaskItem> tasks, List<Comment> comments)
    {
        var now = DateTime.UtcNow;
        var sb = new StringBuilder();

        sb.AppendLine($"# Dự án: {project.Name}");
        if (!string.IsNullOrWhiteSpace(project.Description))
        {
            sb.AppendLine($"Mô tả: {project.Description}");
        }
        sb.AppendLine($"Số thành viên: {project.Members.Count}");
        sb.AppendLine();

        var done = tasks.Count(t => t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase));
        var overdue = tasks.Count(t =>
            t.DueDate.HasValue &&
            t.DueDate.Value < now &&
            !t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase));

        sb.AppendLine($"## Thống kê nhanh");
        sb.AppendLine($"- Tổng số task: {tasks.Count}");
        sb.AppendLine($"- Đã hoàn thành: {done}");
        sb.AppendLine($"- Quá hạn (chưa xong): {overdue}");
        sb.AppendLine();

        sb.AppendLine("## Danh sách task");
        if (tasks.Count == 0)
        {
            sb.AppendLine("(Chưa có task nào)");
        }
        foreach (var t in tasks)
        {
            var due = t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : "không có hạn";
            var late = t.DueDate.HasValue && t.DueDate.Value < now && !t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase)
                ? " [QUÁ HẠN]"
                : string.Empty;
            sb.AppendLine($"- [{t.Status}] (ưu tiên: {t.Priority}, hạn: {due}){late} {t.Title}");
            if (!string.IsNullOrWhiteSpace(t.Description))
            {
                var desc = t.Description.Length > 200 ? t.Description[..200] + "…" : t.Description;
                sb.AppendLine($"    Mô tả: {desc}");
            }
        }
        sb.AppendLine();

        if (comments.Count > 0)
        {
            sb.AppendLine("## Bình luận gần đây");
            foreach (var c in comments)
            {
                var content = c.Content.Length > 200 ? c.Content[..200] + "…" : c.Content;
                sb.AppendLine($"- ({c.CreatedAt:yyyy-MM-dd}) {content}");
            }
            sb.AppendLine();
        }

        sb.AppendLine($"Hôm nay là {now:yyyy-MM-dd}. Hãy tóm tắt tình hình dự án dựa trên dữ liệu trên.");
        return sb.ToString();
    }
}
