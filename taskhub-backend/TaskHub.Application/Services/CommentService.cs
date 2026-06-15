using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class CommentService : ICommentService
{
    private readonly IMongoRepository<Comment> _commentRepository;
    private readonly IMongoRepository<TaskItem> _taskRepository;
    private readonly IMongoRepository<Project> _projectRepository;
    private readonly IUserService _userService;
    private readonly INotificationService _notificationService;
    private readonly IRealtimeNotifier _realtime;

    public CommentService(
        IMongoRepository<Comment> commentRepository,
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Project> projectRepository,
        IUserService userService,
        INotificationService notificationService,
        IRealtimeNotifier realtime)
    {
        _commentRepository = commentRepository;
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _userService = userService;
        _notificationService = notificationService;
        _realtime = realtime;
    }

    // Giới hạn dung lượng đính kèm: ~4MB base64 (~3MB nhị phân) để không vượt giới hạn document MongoDB.
    private const int MaxAttachmentBase64Length = 4 * 1024 * 1024;

    public async Task<Comment?> AddCommentAsync(CreateCommentDto dto, string userId)
    {
        if (dto is null || string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(dto.TaskId))
        {
            return null;
        }

        var hasAttachment = !string.IsNullOrWhiteSpace(dto.AttachmentData);
        // Cho phép comment chỉ có đính kèm (không cần nội dung text), nhưng phải có ít nhất một trong hai.
        if (string.IsNullOrWhiteSpace(dto.Content) && !hasAttachment)
        {
            return null;
        }

        if (hasAttachment && dto.AttachmentData!.Length > MaxAttachmentBase64Length)
        {
            return null;
        }

        var task = await _taskRepository.GetByIdAsync(dto.TaskId.Trim());
        if (task is null || string.IsNullOrWhiteSpace(task.ProjectId))
        {
            return null;
        }

        var project = await _projectRepository.GetByIdAsync(task.ProjectId);
        if (project is null)
        {
            return null;
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isMember)
        {
            return null;
        }

        var comment = new Comment
        {
            Content = dto.Content?.Trim() ?? string.Empty,
            TaskId = dto.TaskId.Trim(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        if (hasAttachment)
        {
            comment.AttachmentData = dto.AttachmentData;
            comment.AttachmentName = string.IsNullOrWhiteSpace(dto.AttachmentName) ? "attachment" : dto.AttachmentName.Trim();
            comment.AttachmentType = string.IsNullOrWhiteSpace(dto.AttachmentType) ? "application/octet-stream" : dto.AttachmentType.Trim();
        }

        await _commentRepository.CreateAsync(comment);

        // Xử lý @mention sau khi lưu bình luận thành công
        await ProcessMentionsAsync(comment, project, userId, task.Title, dto.MentionedUserIds);

        // Báo real-time cho các client đang mở dự án này
        await _realtime.ProjectChangedAsync(project.Id, "commentAdded", new { taskId = comment.TaskId });

        return comment;
    }

    private async Task ProcessMentionsAsync(Comment comment, Project project, string senderId, string taskTitle, List<string>? mentionedUserIds)
    {
        if (mentionedUserIds is null || mentionedUserIds.Count == 0) return;

        // Chỉ thông báo cho thành viên thật của dự án và không phải người gửi.
        var projectMemberIds = project.Members.Select(m => m.UserId).ToHashSet(StringComparer.OrdinalIgnoreCase);
        projectMemberIds.Add(project.OwnerId);

        var sender = await _userService.GetByIdAsync(senderId);
        var senderName = sender?.Username ?? "Ai đó";

        var targetIds = mentionedUserIds
            .Where(id => !string.IsNullOrWhiteSpace(id) && projectMemberIds.Contains(id) && id != senderId)
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var targetId in targetIds)
        {
            await _notificationService.CreateAndSendNotificationAsync(
                targetId,
                $"{senderName} đã nhắc đến bạn trong bình luận ở công việc \"{taskTitle}\"",
                "Mention",
                comment.TaskId,
                true); // Gửi cả Email để người dùng nhận được ngay
        }
    }

    public async Task<List<Comment>> GetCommentsByTaskIdAsync(string taskId, string userId)
    {
        if (string.IsNullOrWhiteSpace(taskId) || string.IsNullOrWhiteSpace(userId))
        {
            return new List<Comment>();
        }

        var task = await _taskRepository.GetByIdAsync(taskId.Trim());
        if (task is null || string.IsNullOrWhiteSpace(task.ProjectId))
        {
            return new List<Comment>();
        }

        var project = await _projectRepository.GetByIdAsync(task.ProjectId);
        if (project is null)
        {
            return new List<Comment>();
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));
        if (!isOwner && !isMember)
        {
            return new List<Comment>();
        }

        var allComments = await _commentRepository.GetAllAsync();
        return allComments
            .Where(c => c.TaskId.Equals(taskId.Trim(), StringComparison.OrdinalIgnoreCase))
            .OrderBy(c => c.CreatedAt)
            .ToList();
    }

    public async Task<bool> DeleteIndividualCommentAsync(string commentId, string userId)
    {
        var comment = await _commentRepository.GetByIdAsync(commentId);
        if (comment == null || !comment.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        await _commentRepository.DeleteAsync(commentId);
        return true;
    }

    public async Task<bool> DeleteCommentsByTaskIdAsync(string taskId)
    {
        if (string.IsNullOrWhiteSpace(taskId)) return false;
        
        var allComments = await _commentRepository.GetAllAsync();
        var taskComments = allComments.Where(c => c.TaskId == taskId).ToList();
        
        foreach (var comment in taskComments)
        {
            await _commentRepository.DeleteAsync(comment.Id);
        }
        return true;
    }
}
