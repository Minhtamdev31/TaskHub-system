using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface ICommentService
{
    Task<Comment?> AddCommentAsync(CreateCommentDto dto, string userId);
    Task<List<Comment>> GetCommentsByTaskIdAsync(string taskId, string userId);
}
