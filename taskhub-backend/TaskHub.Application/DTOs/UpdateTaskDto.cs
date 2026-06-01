namespace TaskHub.Application.DTOs;

public sealed class UpdateTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public DateTime? DueDate { get; set; }
}
