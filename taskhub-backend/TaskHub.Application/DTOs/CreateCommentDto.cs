namespace TaskHub.Application.DTOs;

public sealed class CreateCommentDto
{
    public string Content { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
}
