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

    public CommentService(
        IMongoRepository<Comment> commentRepository,
        IMongoRepository<TaskItem> taskRepository,
        IMongoRepository<Project> projectRepository)
    {
        _commentRepository = commentRepository;
        _taskRepository = taskRepository;
        _projectRepository = projectRepository;
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
        return comment;
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
