using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

/// <summary>
/// Task kèm tên dự án — phục vụ endpoint gộp /tasks/workspace để Dashboard chỉ gọi 1 request
/// thay vì N+1 (trước đây frontend lặp getByProject cho từng dự án).
/// </summary>
public sealed class WorkspaceTaskDto
{
    public WorkspaceTaskDto(TaskItem task, string projectName)
    {
        ArgumentNullException.ThrowIfNull(task);

        Id = task.Id ?? string.Empty;
        Title = task.Title ?? string.Empty;
        Description = task.Description ?? string.Empty;
        Status = task.Status ?? "Todo";
        Priority = task.Priority ?? "Medium";
        DueDate = task.DueDate;
        UserId = task.UserId ?? string.Empty;
        ProjectId = task.ProjectId ?? string.Empty;
        ProjectName = projectName ?? string.Empty;
        CreatedAt = task.CreatedAt;
        UpdatedAt = task.UpdatedAt;
    }

    public string Id { get; }
    public string Title { get; }
    public string Description { get; }
    public string Status { get; }
    public string Priority { get; }
    public DateTime? DueDate { get; }
    public string UserId { get; }
    public string ProjectId { get; }
    public string ProjectName { get; }
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; }
}
