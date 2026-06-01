using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface IUserService
{
    Task<User?> RegisterAsync(string username, string email, string password);
    Task<User?> LoginAsync(string email, string password);
    Task<List<User>> GetAllAsync();
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> UpdateAsync(string id, UpdateUserRequest request);
    Task<bool> DeleteAsync(string id);
    Task<User?> ChangePasswordAsync(string userId, string oldPassword, string newPassword);
    Task<User?> CreateAsync(User user);
}
