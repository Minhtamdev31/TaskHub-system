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

    private static readonly string[] ValidStatuses = { "Todo", "InProgress", "Review", "Done" };
    private static readonly string[] ValidPriorities = { "Low", "Medium", "High", "Critical" };

    public TaskService(
        IMongoRepository<TaskItem> taskRepository, 
        IMongoRepository<Project> projectRepository,
        IMongoRepository<Comment> commentRepository,
        INotificationService notificationService)
    {
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _commentRepository = commentRepository;
        _notificationService = notificationService;
    }

    public async Task<List<TaskItem>> GetTasksByUserIdAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return new List<TaskItem>();
        }

        var allTasks = await _taskRepository.GetAllAsync();
        return allTasks.Where(t => t.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase)).ToList();
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

        var task = new TaskItem
        {
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Status = "Todo",
            Priority = ValidPriorities.Contains(dto.Priority, StringComparer.OrdinalIgnoreCase) ? dto.Priority : "Medium",
            DueDate = dto.DueDate,
            UserId = userId,
            ProjectId = dto.ProjectId.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _taskRepository.CreateAsync(task);
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
                await _notificationService.CreateAndSendNotificationAsync(
                    project.OwnerId,
                    $"Task \"{existingTask.Title}\" changed from {oldStatus} to {normalizedStatus}",
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

        if (dto.DueDate.HasValue)
        {
            existingTask.DueDate = dto.DueDate.Value;
        }

        existingTask.UpdatedAt = DateTime.UtcNow;
        await _taskRepository.UpdateAsync(taskId, existingTask);
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

        var allTasks = await _taskRepository.GetAllAsync();
        return allTasks
            .Where(t => t.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase))
            .ToList();
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
            $"You have been assigned to task: {existingTask.Title}", 
            "Task", 
            taskId);

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
        return true;
    }
}
