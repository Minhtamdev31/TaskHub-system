namespace TaskHub.Application.DTOs;

public sealed class CreateTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public DateTime? DueDate { get; set; }
    /// <summary>
    /// Required: The project this task belongs to.
    /// </summary>
    public string ProjectId { get; set; } = string.Empty;
}
