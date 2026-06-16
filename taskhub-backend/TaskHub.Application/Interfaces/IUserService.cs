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
    Task<User?> SetPasswordAsync(string userId, string newPassword); // đổi mật khẩu sau khi đã xác thực OTP
    Task<User?> ResetPasswordAsync(string email, string newPassword);
    Task<User?> SetSubscriptionAsync(string userId, bool isPremium, int durationDays);
    Task<User?> CreateAsync(User user);
}
