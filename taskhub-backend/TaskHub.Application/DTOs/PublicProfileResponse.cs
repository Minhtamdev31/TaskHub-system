using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

// Profile công khai của một người dùng — chỉ gồm thông tin không nhạy cảm,
// để thành viên trong nhóm xem được hồ sơ của nhau.
public sealed class PublicProfileResponse
{
    public PublicProfileResponse(User user)
    {
        Id = user.Id ?? string.Empty;
        Username = user.Username ?? string.Empty;
        Email = user.Email ?? string.Empty;
        FullName = user.Profile?.FullName ?? string.Empty;
        AvatarUrl = user.Profile?.AvatarUrl ?? string.Empty;
        Bio = user.Profile?.Bio ?? string.Empty;
        JobTitle = user.Profile?.JobTitle ?? string.Empty;
        IsPremium = user.Subscription?.IsActivePremium ?? false;
        CreatedAt = user.CreatedAt;
    }

    public string Id { get; }
    public string Username { get; }
    public string Email { get; }
    public string FullName { get; }
    public string AvatarUrl { get; }
    public string Bio { get; }
    public string JobTitle { get; }
    public bool IsPremium { get; }
    public DateTime CreatedAt { get; }
}
