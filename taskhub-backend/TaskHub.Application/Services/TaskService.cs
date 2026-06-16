using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

/// <summary>
/// TaskService manages task-level operations with user-based authorization.
/// 
/// Authorization:
/// - Tasks are user-owned and scoped to the task creator (UserId)
/// - Only the task creator can view, update, or delete their tasks
/// - Project members can manage tasks within their projects if the task belongs to them
/// 
/// Role Integration:
/// - System roles (Admin/Member) are enforced at the controller level
/// - Project roles (Leader/Member) are enforced at the project level
/// - Task ownership is independent and based on the creator's UserId
/// </summary>
public class TaskService : ITaskService
{
    private readonly IMongoRepository<TaskItem> _taskRepository;
    private readonly IMongoRepository<Project> _projectRepository;
    private readonly IMongoRepository<Comment> _commentRepository;
    private readonly INotificationService _notificationService;
    private readonly IRealtimeNotifier _realtime;

    private static readonly string[] ValidStatuses = { "Todo", "InProgress", "Review", "Done" };
    private static readonly string[] ValidPriorities = { "Low", "Medium", "High", "Critical" };

    // Nhãn trạng thái tiếng Việt cho thông báo (mã nội bộ giữ nguyên trong DB).
    private static string StatusLabel(string status) => status switch
    {
        "Todo" => "Cần làm",
        "InProgress" => "Đang làm",
        "Review" => "Xem xét",
        "Done" => "Hoàn thành",
        _ => status
    };

    public TaskService(
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Project> projectRepository,
        IMongoRepository<Comment> commentRepository,
        INotificationService notificationService,
        IRealtimeNotifier realtime)
    {
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _commentRepository = commentRepository;
        _notificationService = notificationService;
        _realtime = realtime;
    }

    public async Task<List<TaskItem>> GetTasksByUserIdAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return new List<TaskItem>();
        }

        // DB lọc theo index userId thay vì kéo toàn bộ tasks về app.
        return await _taskRepository.FindAsync(t => t.UserId == userId);
    }

    public async Task<TaskItem?> GetTaskByIdAsync(string taskId)
    {
        if (string.IsNullOrEmpty(taskId))
        {
            return null;
        }

        return await _taskRepository.GetByIdAsync(taskId);
    }

    public async Task<TaskItem?> CreateTaskAsync(CreateTaskDto dto, string userId)
    {
        if (dto is null || string.IsNullOrEmpty(userId) || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.ProjectId))
        {
            return null;
        }

        var createdAt = DateTime.UtcNow;
        var task = new TaskItem
        {
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Status = "Todo",
            Priority = ValidPriorities.Contains(dto.Priority, StringComparer.OrdinalIgnoreCase) ? dto.Priority : "Medium",
            DueDate = dto.DueDate,
            UserId = userId,
            ProjectId = dto.ProjectId.Trim(),
            CreatedAt = createdAt,
            StatusHistory = new List<StatusChange> { new() { Status = "Todo", ChangedAt = createdAt } }
        };

        await _taskRepository.CreateAsync(task);
        await _realtime.ProjectChangedAsync(task.ProjectId, "taskCreated", new { taskId = task.Id });
        return task;
    }

    public async Task<bool> UpdateTaskAsync(string taskId, UpdateTaskDto dto, string userId)
    {
        if (string.IsNullOrEmpty(taskId) || string.IsNullOrEmpty(userId) || dto is null)
        {
            return false;
        }

        var existingTask = await GetTaskByIdAsync(taskId);
        if (existingTask is null || string.IsNullOrWhiteSpace(existingTask.ProjectId))
        {
            return false;
        }

        var project = await _projectRepository.GetByIdAsync(existingTask.ProjectId);
        if (project is null)
        {
            return false;
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isLeader = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) && m.ProjectRole.Equals("Leader", StringComparison.OrdinalIgnoreCase));
        var isAssignee = existingTask.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase);

        if (!isOwner && !isLeader && !isAssignee)
        {
            return false;
        }

        var oldStatus = existingTask.Status;
        if (!string.IsNullOrWhiteSpace(dto.Title))
        {
            existingTask.Title = dto.Title.Trim();
        }

        if (dto.Description is not null)
        {
            existingTask.Description = dto.Description.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            var normalizedStatus = dto.Status.Trim();
            if (!ValidStatuses.Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
            {
                return false;
            }

            existingTask.Status = normalizedStatus;

            // Thông báo cho chủ dự án khi trạng thái công việc thay đổi (Feature 6)
            if (!oldStatus.Equals(normalizedStatus, StringComparison.OrdinalIgnoreCase))
            {
                existingTask.StatusHistory ??= new List<StatusChange>();
                existingTask.StatusHistory.Add(new StatusChange { Status = normalizedStatus, ChangedAt = DateTime.UtcNow });

                await _notificationService.CreateAndSendNotificationAsync(
                    project.OwnerId,
                    $"Công việc \"{existingTask.Title}\" chuyển từ {StatusLabel(oldStatus)} sang {StatusLabel(normalizedStatus)}",
                    "Task",
                    taskId);
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.Priority))
        {
            var normalizedPriority = dto.Priority.Trim();
            if (!ValidPriorities.Contains(normalizedPriority, StringComparer.OrdinalIgnoreCase))
            {
                return false;
            }

            existingTask.Priority = normalizedPriority;
        }

        if (dto.ClearDueDate)
        {
            existingTask.DueDate = null;
        }
        else if (dto.DueDate.HasValue)
        {
            existingTask.DueDate = dto.DueDate.Value;
        }

        existingTask.UpdatedAt = DateTime.UtcNow;
        await _taskRepository.UpdateAsync(taskId, existingTask);
        await _realtime.ProjectChangedAsync(existingTask.ProjectId, "taskUpdated", new { taskId });
        return true;
    }

    public async Task<List<TaskItem>> GetTasksByProjectIdAsync(string projectId, string userId)
    {
        if (string.IsNullOrWhiteSpace(projectId) || string.IsNullOrEmpty(userId))
        {
            return new List<TaskItem>();
        }

        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return new List<TaskItem>();
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isMember)
        {
            return new List<TaskItem>();
        }

        // DB lọc theo index projectId.
        return await _taskRepository.FindAsync(t => t.ProjectId == projectId);
    }

    public async Task<bool> AssignTaskAsync(string taskId, AssignTaskDto dto, string currentUserId)
    {
        if (string.IsNullOrEmpty(taskId) || string.IsNullOrEmpty(currentUserId) || dto is null || string.IsNullOrWhiteSpace(dto.TargetUserId))
        {
            return false;
        }

        var existingTask = await GetTaskByIdAsync(taskId);
        if (existingTask is null || string.IsNullOrWhiteSpace(existingTask.ProjectId))
        {
            return false;
        }

        var project = await _projectRepository.GetByIdAsync(existingTask.ProjectId);
        if (project is null)
        {
            return false;
        }

        var isOwner = project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase);
        var isLeader = project.Members.Any(m => m.UserId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase) && m.ProjectRole.Equals("Leader", StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isLeader)
        {
            return false;
        }

        var targetUserId = dto.TargetUserId.Trim();
        var isProjectMember = project.OwnerId.Equals(targetUserId, StringComparison.OrdinalIgnoreCase) ||
            project.Members.Any(m => m.UserId.Equals(targetUserId, StringComparison.OrdinalIgnoreCase));
        if (!isProjectMember)
        {
            return false;
        }

        existingTask.UserId = targetUserId;
        existingTask.UpdatedAt = DateTime.UtcNow;
        await _taskRepository.UpdateAsync(taskId, existingTask);

        // Trigger Notification
        await _notificationService.CreateAndSendNotificationAsync(
            targetUserId, 
            $"Bạn được giao công việc: {existingTask.Title}",
            "Task",
            taskId);

        await _realtime.ProjectChangedAsync(existingTask.ProjectId, "taskAssigned", new { taskId });

        return true;
    }

    public async Task<bool> DeleteTaskAsync(string taskId, string userId)
    {
        if (string.IsNullOrEmpty(taskId) || string.IsNullOrEmpty(userId))
        {
            return false;
        }

        var existingTask = await GetTaskByIdAsync(taskId);
        if (existingTask is null || string.IsNullOrWhiteSpace(existingTask.ProjectId))
        {
            return false;
        }

        var project = await _projectRepository.GetByIdAsync(existingTask.ProjectId);
        if (project is null)
        {
            return false;
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isLeader = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) && m.ProjectRole.Equals("Leader", StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isLeader)
        {
            return false;
        }

        // Cascade delete: Xóa tất cả comment thuộc về task này
        var allComments = await _commentRepository.GetAllAsync();
        var taskComments = allComments.Where(c => c.TaskId == taskId).ToList();
        foreach (var comment in taskComments)
        {
            await _commentRepository.DeleteAsync(comment.Id);
        }

        await _taskRepository.DeleteAsync(taskId);
        await _realtime.ProjectChangedAsync(existingTask.ProjectId, "taskDeleted", new { taskId });
        return true;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(string userId)
    {
        var stats = new DashboardStatsDto();
        if (string.IsNullOrEmpty(userId))
        {
            return stats;
        }

        // Phạm vi: mọi task trong các dự án người dùng sở hữu hoặc là thành viên.
        // Dùng index ownerId / members.userId thay vì quét toàn bộ projects.
        var projects = await _projectRepository.FindAsync(p =>
            p.OwnerId == userId || p.Members.Any(m => m.UserId == userId));
        var projectIds = projects.Select(p => p.Id).ToList();

        // Lấy task theo $in danh sách projectId (index projectId), tránh tải toàn bộ tasks.
        var tasks = projectIds.Count == 0
            ? new List<TaskItem>()
            : await _taskRepository.FindAsync(t => projectIds.Contains(t.ProjectId));

        var now = DateTime.UtcNow;
        var weekAgo = now.AddDays(-7);

        // --- Ảnh chụp hiện tại ---
        int totalNow = tasks.Count;
        int doneNow = tasks.Count(t => StatusAt(t, now) == "Done");
        int wipNow = tasks.Count(t => StatusAt(t, now) is "InProgress" or "Review");
        int prodNow = totalNow > 0 ? (int)Math.Round(doneNow * 100.0 / totalNow) : 0;

        // --- Ảnh chụp cùng thời điểm tuần trước (tái dựng từ lịch sử) ---
        var existedLastWeek = tasks.Where(t => t.CreatedAt <= weekAgo).ToList();
        int totalLast = existedLastWeek.Count;
        int doneLast = existedLastWeek.Count(t => StatusAt(t, weekAgo) == "Done");
        int wipLast = existedLastWeek.Count(t => StatusAt(t, weekAgo) is "InProgress" or "Review");
        int prodLast = totalLast > 0 ? (int)Math.Round(doneLast * 100.0 / totalLast) : 0;

        stats.TotalTasks = totalNow;
        stats.CompletedTasks = doneNow;
        stats.InProgressTasks = wipNow;
        stats.Productivity = prodNow;
        stats.TotalChangePct = PctChange(totalNow, totalLast);
        stats.CompletedChangePct = PctChange(doneNow, doneLast);
        stats.InProgressChangePct = PctChange(wipNow, wipLast);
        stats.ProductivityChangePoints = prodNow - prodLast;

        // --- Công việc hoàn thành theo ngày trong tuần (T2..CN) ---
        var weekStart = StartOfWeek(now);
        foreach (var t in tasks)
        {
            var doneAt = LastTransitionTo(t, "Done");
            if (doneAt is null) continue;
            var idx = (int)Math.Floor((doneAt.Value - weekStart).TotalDays);
            if (idx >= 0 && idx < 7) stats.WeeklyCompleted[idx]++;
        }

        return stats;
    }

    // Đưa về đầu tuần (Thứ 2, 00:00 UTC).
    private static DateTime StartOfWeek(DateTime d)
    {
        var date = d.Date;
        int diff = ((int)date.DayOfWeek + 6) % 7; // Monday = 0
        return date.AddDays(-diff);
    }

    // % thay đổi tương đối; prev = 0 và cur > 0 → +100%.
    private static int PctChange(int cur, int prev)
    {
        if (prev == 0) return cur > 0 ? 100 : 0;
        return (int)Math.Round((cur - prev) * 100.0 / prev);
    }

    // Lịch sử trạng thái hiệu dụng — tự suy ra cho task cũ chưa có StatusHistory.
    private static IEnumerable<StatusChange> EffectiveHistory(TaskItem t)
    {
        if (t.StatusHistory is { Count: > 0 })
        {
            return t.StatusHistory.OrderBy(h => h.ChangedAt);
        }

        // Task cũ: giả định khởi tạo là Todo lúc CreatedAt, và nếu hiện không phải Todo
        // thì đã chuyển sang trạng thái hiện tại tại thời điểm UpdatedAt (xấp xỉ).
        var history = new List<StatusChange> { new() { Status = "Todo", ChangedAt = t.CreatedAt } };
        if (!string.Equals(t.Status, "Todo", StringComparison.OrdinalIgnoreCase))
        {
            history.Add(new StatusChange { Status = t.Status, ChangedAt = t.UpdatedAt ?? t.CreatedAt });
        }
        return history;
    }

    // Trạng thái của task tại thời điểm T (null nếu chưa tồn tại).
    private static string? StatusAt(TaskItem t, DateTime at)
    {
        if (t.CreatedAt > at) return null;
        string? status = null;
        foreach (var h in EffectiveHistory(t))
        {
            if (h.ChangedAt <= at) status = h.Status;
            else break;
        }
        return status;
    }

    // Thời điểm gần nhất task chuyển sang trạng thái cho trước (null nếu chưa từng).
    private static DateTime? LastTransitionTo(TaskItem t, string status)
    {
        DateTime? when = null;
        foreach (var h in EffectiveHistory(t))
        {
            if (string.Equals(h.Status, status, StringComparison.OrdinalIgnoreCase)) when = h.ChangedAt;
        }
        return when;
    }
}
