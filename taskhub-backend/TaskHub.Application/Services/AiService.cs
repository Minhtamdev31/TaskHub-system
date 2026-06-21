using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
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
    private readonly IMongoRepository<AiAnalysis> _analysisRepository;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    // Giới hạn dữ liệu đưa vào prompt để kiểm soát chi phí token.
    private const int MaxTasks = 100;
    private const int MaxComments = 40;

    // Model miễn phí của Groq (API tương thích OpenAI).
    private const string GroqModel = "llama-3.3-70b-versatile";
    private const string GroqEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    private const string SystemInstruction =
        "Bạn là trợ lý quản lý dự án của TaskHub. Hãy tóm tắt tình hình dự án bằng tiếng Việt, " +
        "giọng văn chuyên nghiệp, ngắn gọn và dễ đọc. Trình bày theo các mục: " +
        "**Tổng quan tiến độ**, **Đang tắc/Rủi ro**, **Việc quá hạn**, và **Đề xuất tiếp theo**. " +
        "Chỉ dựa trên dữ liệu được cung cấp, không bịa thông tin. Dùng markdown với gạch đầu dòng khi phù hợp.";

    public AiService(
        IMongoRepository<Project> projectRepository,
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Comment> commentRepository,
        IMongoRepository<AiAnalysis> analysisRepository,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _projectRepository = projectRepository;
        _taskRepository = taskRepository;
        _commentRepository = commentRepository;
        _analysisRepository = analysisRepository;
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

        var apiKey = _configuration["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Groq API key chưa được cấu hình (Groq:ApiKey).");
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
        var text = await CallGroqAsync(SystemInstruction, prompt, 2000);
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    // ====== Gọi Groq (tách dùng chung cho mọi tính năng AI) ======
    private async Task<string> CallGroqAsync(string systemPrompt, string userPrompt, int maxTokens)
    {
        var apiKey = _configuration["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Groq API key chưa được cấu hình (Groq:ApiKey).");
        }

        var requestBody = new
        {
            model = GroqModel,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            max_tokens = maxTokens,
            temperature = 0.3
        };

        var http = _httpClientFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(60);

        using var request = new HttpRequestMessage(HttpMethod.Post, GroqEndpoint)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var resp = await http.SendAsync(request);
        var body = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Groq API {(int)resp.StatusCode}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        return ExtractText(doc.RootElement);
    }

    // ====== Cache DB theo hash: dữ liệu không đổi → trả bản đã lưu (0 token) ======
    private static string Sha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }

    private async Task<string?> GetOrGenerateAsync(string cacheKey, string sourceHash, string userId, Func<Task<string>> generate)
    {
        var existing = await _analysisRepository.FindOneAsync(a => a.CacheKey == cacheKey);
        if (existing is not null && existing.SourceHash == sourceHash && !string.IsNullOrWhiteSpace(existing.Content))
        {
            return existing.Content; // cache hit — không gọi Groq
        }

        var content = await generate();
        if (string.IsNullOrWhiteSpace(content)) return null;

        if (existing is null)
        {
            await _analysisRepository.CreateAsync(new AiAnalysis
            {
                CacheKey = cacheKey, SourceHash = sourceHash, Content = content,
                GeneratedByUserId = userId, GeneratedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.SourceHash = sourceHash;
            existing.Content = content;
            existing.GeneratedByUserId = userId;
            existing.GeneratedAt = DateTime.UtcNow;
            await _analysisRepository.UpdateAsync(existing.Id, existing);
        }
        return content;
    }

    // ====== Phân tích 1 task ======
    private const string TaskSystemInstruction =
        "Bạn là trợ lý quản lý công việc của TaskHub. Dựa trên 1 công việc được cung cấp, hãy trả lời ngắn gọn bằng tiếng Việt theo 3 mục: " +
        "**Tóm tắt** (1-2 câu nội dung công việc), **Việc cần làm** (gạch đầu dòng các bước nên thực hiện), " +
        "**Lưu ý** (về độ ưu tiên & hạn chót). Chỉ dựa trên dữ liệu đưa vào, không bịa. Dùng markdown.";

    public async Task<string?> AnalyzeTaskAsync(string taskId, string userId)
    {
        if (string.IsNullOrEmpty(taskId) || string.IsNullOrEmpty(userId)) return null;

        var task = await _taskRepository.GetByIdAsync(taskId);
        if (task is null || string.IsNullOrWhiteSpace(task.ProjectId)) return null;

        // Quyền: phải là owner/thành viên của dự án chứa task.
        var project = await _projectRepository.GetByIdAsync(task.ProjectId);
        if (project is null) return null;
        var hasAccess = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase) ||
                        project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));
        if (!hasAccess) return null;

        var due = task.DueDate?.ToString("o") ?? "";
        // KHÔNG đưa Status vào hash: trạng thái chỉ là tiến độ, không đổi nội dung phân tích
        // → đổi trạng thái không tốn token gọi lại AI.
        var sourceHash = Sha256($"{task.Title}|{task.Description}|{task.Priority}|{due}");

        return await GetOrGenerateAsync($"task:{taskId}", sourceHash, userId, () =>
        {
            var now = DateTime.UtcNow;
            var dueStr = task.DueDate.HasValue ? task.DueDate.Value.ToString("yyyy-MM-dd HH:mm") : "không có hạn";
            var overdue = task.DueDate.HasValue && task.DueDate.Value < now && task.Status != "Done" ? " (ĐÃ QUÁ HẠN)" : "";
            var prompt =
                $"Tiêu đề: {task.Title}\n" +
                $"Mô tả: {(string.IsNullOrWhiteSpace(task.Description) ? "(không có)" : task.Description)}\n" +
                $"Trạng thái: {task.Status}\n" +
                $"Độ ưu tiên: {task.Priority}\n" +
                $"Hạn chót: {dueStr}{overdue}\n" +
                $"Hôm nay: {now:yyyy-MM-dd HH:mm}";
            return CallGroqAsync(TaskSystemInstruction, prompt, 600);
        });
    }

    // ====== Tóm tắt công việc của tôi (Dashboard) ======
    private const string MyWorkSystemInstruction =
        "Bạn là trợ lý cá nhân của TaskHub. Tóm tắt khối lượng công việc của người dùng bằng tiếng Việt theo các mục: " +
        "**Tổng quan**, **Cần ưu tiên** (việc gấp/quá hạn), **Gợi ý hôm nay**. Ngắn gọn, chỉ dựa trên dữ liệu, dùng markdown.";

    public async Task<string?> SummarizeMyWorkAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId)) return null;

        var projects = await _projectRepository.FindAsync(p =>
            p.OwnerId == userId || p.Members.Any(m => m.UserId == userId));
        var projectIds = projects.Select(p => p.Id).ToList();
        var tasks = projectIds.Count == 0
            ? new List<TaskItem>()
            : (await _taskRepository.FindAsync(t => projectIds.Contains(t.ProjectId)))
                .Where(t => t.UserId == userId) // chỉ việc giao cho user
                .ToList();

        // Hash snapshot: nếu các việc của user không đổi thì tái dùng tóm tắt.
        var snapshot = string.Join(";", tasks
            .OrderBy(t => t.Id)
            .Select(t => $"{t.Id}:{t.Status}:{t.Priority}:{t.DueDate?.ToString("o")}:{t.UpdatedAt?.ToString("o")}"));
        var sourceHash = Sha256(snapshot);

        return await GetOrGenerateAsync($"mywork:{userId}", sourceHash, userId, () =>
        {
            var now = DateTime.UtcNow;
            var sb = new StringBuilder();
            sb.AppendLine($"Hôm nay: {now:yyyy-MM-dd HH:mm}. Tổng số việc của tôi: {tasks.Count}.");
            foreach (var t in tasks.OrderBy(t => t.DueDate ?? DateTime.MaxValue).Take(MaxTasks))
            {
                var dueStr = t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd HH:mm") : "không có hạn";
                var overdue = t.DueDate.HasValue && t.DueDate.Value < now && t.Status != "Done" ? " [QUÁ HẠN]" : "";
                sb.AppendLine($"- [{t.Status}] (ưu tiên {t.Priority}, hạn {dueStr}){overdue} {t.Title}");
            }
            return CallGroqAsync(MyWorkSystemInstruction, sb.ToString(), 800);
        });
    }

    private static string ExtractText(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
        {
            return string.Empty;
        }

        var first = choices[0];
        if (!first.TryGetProperty("message", out var message) ||
            !message.TryGetProperty("content", out var content))
        {
            return string.Empty;
        }

        return content.GetString() ?? string.Empty;
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
