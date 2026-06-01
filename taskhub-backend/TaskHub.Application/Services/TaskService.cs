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
    private readonly IProjectService _projectService;

    public TaskService(IMongoRepository<TaskItem> taskRepository, IProjectService projectService)
    {
        _taskRepository = taskRepository;
        _projectService = projectService;
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
        if (existingTask is null || !existingTask.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

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
            existingTask.Status = dto.Status.Trim();
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

        var project = await _projectService.GetProjectByIdAsync(projectId);
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

    public async Task<bool> DeleteTaskAsync(string taskId, string userId)
    {
        if (string.IsNullOrEmpty(taskId) || string.IsNullOrEmpty(userId))
        {
            return false;
        }

        var existingTask = await GetTaskByIdAsync(taskId);
        if (existingTask is null || !existingTask.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        await _taskRepository.DeleteAsync(taskId);
        return true;
    }
}
