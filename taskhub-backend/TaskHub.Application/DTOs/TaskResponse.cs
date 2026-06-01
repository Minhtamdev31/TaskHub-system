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
        DueDate = task.DueDate;
        UserId = task.UserId ?? string.Empty;
        CreatedAt = task.CreatedAt;
        UpdatedAt = task.UpdatedAt;
    }

    public string Id { get; }
    public string Title { get; }
    public string Description { get; }
    public string Status { get; }
    public DateTime? DueDate { get; }
    public string UserId { get; }
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; }
}
