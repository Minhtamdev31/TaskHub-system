namespace TaskHub.Application.DTOs;

public sealed class CreateCommentDto
{
    public string Content { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;

    // Optional attachment: file name, MIME type, and base64 data string.
    public string? AttachmentName { get; set; }
    public string? AttachmentType { get; set; }
    public string? AttachmentData { get; set; }
}
