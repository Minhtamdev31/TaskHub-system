using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface ITaskService
{
    Task<List<TaskItem>> GetTasksByUserIdAsync(string userId);
    Task<TaskItem?> GetTaskByIdAsync(string taskId);
    Task<TaskItem?> CreateTaskAsync(CreateTaskDto dto, string userId);
    Task<List<TaskItem>> GetTasksByProjectIdAsync(string projectId, string userId);
    Task<bool> UpdateTaskAsync(string taskId, UpdateTaskDto dto, string userId);
    Task<bool> AssignTaskAsync(string taskId, AssignTaskDto dto, string currentUserId);
    Task<bool> DeleteTaskAsync(string taskId, string userId);
    Task<DashboardStatsDto> GetDashboardStatsAsync(string userId);
}
