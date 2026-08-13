using BCrypt.Net;
using Microsoft.Extensions.Caching.Memory;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class UserService : IUserService
{
    private readonly IMongoRepository<User> _userRepository;
    private readonly IMemoryCache _cache;

    // Cache 1 user theo id (phục vụ /users/me, gọi rất nhiều). TTL ngắn làm "lưới an toàn",
    // và xóa chủ động mỗi khi user bị sửa (xem InvalidateUserCache). Khóa: user:{id}.
    private static readonly TimeSpan UserCacheTtl = TimeSpan.FromMinutes(5);
    private static string UserCacheKey(string id) => $"user:{id}";

    public UserService(IMongoRepository<User> userRepository, IMemoryCache cache)
    {
        _userRepository = userRepository;
        _cache = cache;
    }

    // Xóa cache của 1 user — gọi sau MỌI thao tác ghi lên user đó (kể cả từ service khác).
    public void InvalidateUserCache(string userId)
    {
        if (!string.IsNullOrEmpty(userId)) _cache.Remove(UserCacheKey(userId));
    }

    public async Task<User?> RegisterAsync(string username, string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var trimmedUsername = username.Trim();

        // Kiểm tra trùng email/username bằng truy vấn có điều kiện (dùng index unique),
        // không tải toàn bộ users.
        if (await _userRepository.FindOneAsync(u => u.Email == normalizedEmail) is not null ||
            await _userRepository.FindOneAsync(u => u.Username == trimmedUsername) is not null)
        {
            return null;
        }

        var user = new User
        {
            Username = trimmedUsername,
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

    public async Task<(List<User> Items, long Total)> GetPagedAsync(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var total = await _userRepository.CountAsync(_ => true);
        var items = await _userRepository.FindPagedAsync(_ => true, (page - 1) * pageSize, pageSize);
        return (items, total);
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        if (string.IsNullOrEmpty(id)) return null;

        // Cache hit → khỏi chạm DB. Miss → lấy từ DB rồi lưu lại với TTL ngắn.
        return await _cache.GetOrCreateAsync(UserCacheKey(id), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = UserCacheTtl;
            return await _userRepository.GetByIdAsync(id);
        });
    }

    public async Task<User?> UpdateAsync(string id, UpdateUserRequest request)
    {
        // Đọc bản tươi từ DB (không qua cache) vì sắp sửa tại chỗ — tránh làm bẩn object đang nằm trong cache.
        var existingUser = await _userRepository.GetByIdAsync(id);
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
            var trimmedUsername = request.Username.Trim();
            if (!trimmedUsername.Equals(existingUser.Username, StringComparison.OrdinalIgnoreCase))
            {
                if (await _userRepository.FindOneAsync(u => u.Username == trimmedUsername) is not null) return null;
            }
            existingUser.Username = trimmedUsername;
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
        InvalidateUserCache(id);
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
        InvalidateUserCache(id);
        return true;
    }

    public async Task<User?> ChangePasswordAsync(string userId, string oldPassword, string newPassword)
    {
        var user = await _userRepository.GetByIdAsync(userId);
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
        InvalidateUserCache(userId);
        return user;
    }

    public async Task<User?> SetPasswordAsync(string userId, string newPassword)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(userId, user);
        InvalidateUserCache(userId);
        return user;
    }

    public async Task<User?> ResetPasswordAsync(string email, string newPassword)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await GetByEmailAsync(normalizedEmail);
        if (user is null)
        {
            return null;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user.Id!, user);
        InvalidateUserCache(user.Id!);
        return user;
    }

    public async Task<User?> SetSubscriptionAsync(string userId, bool isPremium, int durationDays)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        user.Subscription ??= SubscriptionInfo.FreeActive;

        if (isPremium)
        {
            user.Subscription.Plan = "Premium";
            user.Subscription.Status = "Active";
            user.Subscription.IsPremium = true;
            user.Subscription.StartDate = DateTime.UtcNow;
            // Cộng dồn nếu đang còn hạn Premium
            var baseDate = user.Subscription.PremiumUntil > DateTime.UtcNow
                ? user.Subscription.PremiumUntil!.Value
                : DateTime.UtcNow;
            user.Subscription.PremiumUntil = durationDays > 0 ? baseDate.AddDays(durationDays) : null;
            user.Subscription.EndDate = user.Subscription.PremiumUntil;
        }
        else
        {
            user.Subscription.Plan = "Free";
            user.Subscription.Status = "Active";
            user.Subscription.IsPremium = false;
            user.Subscription.PremiumUntil = null;
            user.Subscription.EndDate = null;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(userId, user);
        InvalidateUserCache(userId);
        return user;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        // Email luôn được lưu ở dạng lowercase (xem RegisterAsync/UpdateAsync) nên so khớp
        // chính xác trên field đã đánh index thay vì kéo toàn bộ users về lọc.
        var normalized = (email ?? string.Empty).Trim().ToLowerInvariant();
        return await _userRepository.FindOneAsync(u => u.Email == normalized);
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

    public async Task<bool> EnsureAdminAsync(string username, string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existing = await _userRepository.FindOneAsync(u => u.Email == normalizedEmail);

        if (existing is null)
        {
            var admin = new User
            {
                Username = username.Trim(),
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = "Admin",
                IsActive = true,
                IsEmailVerified = true,
                Subscription = SubscriptionInfo.FreeActive
            };
            await _userRepository.CreateAsync(admin);
            return true;
        }

        // Đã tồn tại nhưng chưa phải Admin → nâng quyền (không đụng tới mật khẩu hiện có).
        if (existing.Role != "Admin")
        {
            existing.Role = "Admin";
            existing.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(existing.Id, existing);
            InvalidateUserCache(existing.Id);
            return true;
        }

        return false;
    }

    // Tạo sẵn các tài khoản demo cho giảng viên chấm bài. Idempotent: đã có email thì bỏ qua
    // (không đụng mật khẩu). Email đã verify sẵn + không cần OTP để đăng nhập được ngay.
    public async Task<int> EnsureDemoUsersAsync()
    {
        var demos = new[]
        {
            (Email: "premium@taskhub.com", Username: "premiumdemo", FullName: "Người Dùng Premium", Password: "Demo@1234", IsPremium: true),
            (Email: "member@taskhub.com",  Username: "memberdemo",  FullName: "Thành Viên Dự Án",   Password: "Demo@1234", IsPremium: false),
            (Email: "demo@taskhub.com",    Username: "guestdemo",   FullName: "Tài Khoản Demo",      Password: "Demo@1234", IsPremium: false),
        };

        var created = 0;
        foreach (var d in demos)
        {
            var email = d.Email.Trim().ToLowerInvariant();
            if (await _userRepository.FindOneAsync(u => u.Email == email) is not null)
            {
                continue;
            }

            var subscription = d.IsPremium
                ? new SubscriptionInfo
                {
                    Plan = "Premium",
                    Status = "Active",
                    StartDate = DateTime.UtcNow,
                    IsPremium = true,
                    PremiumUntil = DateTime.UtcNow.AddYears(5),
                }
                : SubscriptionInfo.FreeActive;

            var user = new User
            {
                Username = d.Username,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(d.Password),
                Role = "Member",
                IsActive = true,
                IsEmailVerified = true,
                Subscription = subscription,
                Profile = new User.UserProfile { FullName = d.FullName },
            };

            await _userRepository.CreateAsync(user);
            created++;
        }

        return created;
    }
}
