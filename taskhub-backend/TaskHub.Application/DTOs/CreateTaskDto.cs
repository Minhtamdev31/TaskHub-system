namespace TaskHub.Application.DTOs;

public sealed class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    /// <summary>
    /// Optional: Associate the task with a project.
    /// If provided, the task will be deleted when the project is deleted (Cascade Delete).
    /// </summary>
    public string? ProjectId { get; set; }
}
