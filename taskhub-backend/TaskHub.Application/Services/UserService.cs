using BCrypt.Net;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class UserService : IUserService
{
    private readonly IMongoRepository<User> _userRepository;

    public UserService(IMongoRepository<User> userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<User?> RegisterAsync(string username, string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await GetByEmailAsync(normalizedEmail) is not null)
        {
            return null;
        }

        var user = new User
        {
            Username = username.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Subscription = SubscriptionInfo.FreeActive,
            Role = "Member"
        };

        await _userRepository.CreateAsync(user);
        return user;
    }

    public async Task<User?> LoginAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await GetByEmailAsync(normalizedEmail);
        if (user is null)
        {
            return null;
        }

        return BCrypt.Net.BCrypt.Verify(password, user.PasswordHash) ? user : null;
    }

    public async Task<List<User>> GetAllAsync()
    {
        return await _userRepository.GetAllAsync();
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        return await _userRepository.GetByIdAsync(id);
    }

    public async Task<User?> UpdateAsync(string id, UpdateUserRequest request)
    {
        var existingUser = await GetByIdAsync(id);
        if (existingUser is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            if (!normalizedEmail.Equals(existingUser.Email, StringComparison.OrdinalIgnoreCase) && await GetByEmailAsync(normalizedEmail) is not null)
            {
                return null;
            }

            existingUser.Email = normalizedEmail;
        }

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            existingUser.Username = request.Username.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            existingUser.Role = request.Role.Trim();
        }

        if (request.IsActive.HasValue)
        {
            existingUser.IsActive = request.IsActive.Value;
        }

        if (request.IsEmailVerified.HasValue)
        {
            existingUser.IsEmailVerified = request.IsEmailVerified.Value;
        }

        if (request.FullName is not null)
        {
            existingUser.Profile.FullName = request.FullName;
        }

        if (request.AvatarUrl is not null)
        {
            existingUser.Profile.AvatarUrl = request.AvatarUrl;
        }

        if (request.Bio is not null)
        {
            existingUser.Profile.Bio = request.Bio;
        }

        if (request.PhoneNumber is not null)
        {
            existingUser.Profile.PhoneNumber = request.PhoneNumber;
        }

        if (request.JobTitle is not null)
        {
            existingUser.Profile.JobTitle = request.JobTitle;
        }

        if (request.Theme is not null)
        {
            existingUser.Settings.Theme = request.Theme;
        }

        if (request.Language is not null)
        {
            existingUser.Settings.Language = request.Language;
        }

        if (request.EnableNotifications.HasValue)
        {
            existingUser.Settings.EnableNotifications = request.EnableNotifications.Value;
        }

        existingUser.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(id, existingUser);
        return existingUser;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var existingUser = await GetByIdAsync(id);
        if (existingUser is null)
        {
            return false;
        }

        await _userRepository.DeleteAsync(id);
        return true;
    }

    public async Task<User?> ChangePasswordAsync(string userId, string oldPassword, string newPassword)
    {
        var user = await GetByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        if (!BCrypt.Net.BCrypt.Verify(oldPassword, user.PasswordHash))
        {
            return null;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(userId, user);
        return user;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        var allUsers = await _userRepository.GetAllAsync();
        return allUsers.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<User?> CreateAsync(User user)
    {
        if (user is null)
        {
            return null;
        }

        await _userRepository.CreateAsync(user);
        return user;
    }
}
