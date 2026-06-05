using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
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

    public CommentService(
        IMongoRepository<Comment> commentRepository,
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Project> projectRepository,
        IUserService userService,
        INotificationService notificationService)
    {
        _commentRepository = commentRepository;
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
        _userService = userService;
        _notificationService = notificationService;
    }

    public async Task<Comment?> AddCommentAsync(CreateCommentDto dto, string userId)
    {
        if (dto is null || string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(dto.Content) || string.IsNullOrWhiteSpace(dto.TaskId))
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
            Content = dto.Content.Trim(),
            TaskId = dto.TaskId.Trim(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _commentRepository.CreateAsync(comment);

        // Xử lý @mention sau khi lưu bình luận thành công
        await ProcessMentionsAsync(comment, project, userId, task.Title);

        return comment;
    }

    private async Task ProcessMentionsAsync(Comment comment, Project project, string senderId, string taskTitle)
    {
        // Regex tìm các từ bắt đầu bằng @ (Ví dụ: @huy, @admin)
        var mentionRegex = new Regex(@"@(\w+)", RegexOptions.Compiled);
        var matches = mentionRegex.Matches(comment.Content);
        var mentionedUsernames = matches.Cast<Match>().Select(m => m.Groups[1].Value).Distinct();

        if (!mentionedUsernames.Any()) return;

        // Lấy danh sách user và thành viên dự án để kiểm tra quyền
        var allUsers = await _userService.GetAllAsync();
        var projectMemberIds = project.Members.Select(m => m.UserId).ToList();
        if (!projectMemberIds.Contains(project.OwnerId)) projectMemberIds.Add(project.OwnerId);

        var sender = allUsers.FirstOrDefault(u => u.Id == senderId);
        var senderName = sender?.Username ?? "Someone";

        foreach (var username in mentionedUsernames)
        {
            // Tìm tất cả user khớp username trong dự án và không phải người gửi
            var targetUsers = allUsers.Where(u => 
                u.Username.Equals(username, StringComparison.OrdinalIgnoreCase) && 
                projectMemberIds.Contains(u.Id) &&
                u.Id != senderId).ToList();

            foreach (var targetUser in targetUsers)
            {
                await _notificationService.CreateAndSendNotificationAsync(
                    targetUser.Id,
                    $"{senderName} mentioned you in a comment on task \"{taskTitle}\"",
                    "Mention",
                    comment.TaskId,
                    true); // Gửi cả Email để người dùng nhận được ngay
            }
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
}
