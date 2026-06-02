using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public sealed class CommentResponse
{
    public CommentResponse(Comment comment)
    {
        if (comment is null)
        {
            throw new ArgumentNullException(nameof(comment));
        }

        Id = comment.Id ?? string.Empty;
        Content = comment.Content ?? string.Empty;
        TaskId = comment.TaskId ?? string.Empty;
        UserId = comment.UserId ?? string.Empty;
        CreatedAt = comment.CreatedAt;
    }

    public string Id { get; }
    public string Content { get; }
    public string TaskId { get; }
    public string UserId { get; }
    public DateTime CreatedAt { get; }
}
