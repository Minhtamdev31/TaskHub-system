using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public sealed class TaskResponse
{
    public TaskResponse(TaskItem task)
    {
        if (task is null)
        {
            throw new ArgumentNullException(nameof(task));
        }

        Id = task.Id ?? string.Empty;
        Title = task.Title ?? string.Empty;
        Description = task.Description ?? string.Empty;
        Status = task.Status ?? "Todo";
        Priority = task.Priority ?? "Medium";
        DueDate = task.DueDate;
        UserId = task.UserId ?? string.Empty;
        ProjectId = task.ProjectId ?? string.Empty;
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
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; }
}
