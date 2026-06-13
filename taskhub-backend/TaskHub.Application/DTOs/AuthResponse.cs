using MongoDB.Bson.Serialization.Attributes;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

[BsonIgnoreExtraElements]
public sealed class AuthResponse
{
    public AuthResponse(User user)
    {
        if (user is null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        Id = user.Id ?? string.Empty;
        Username = user.Username ?? string.Empty;
        Email = user.Email ?? string.Empty;
        Subscription = user.Subscription ?? SubscriptionInfo.FreeActive;
        Role = string.IsNullOrWhiteSpace(user.Role) ? "User" : user.Role;
        Profile = user.Profile ?? new User.UserProfile();
        Settings = user.Settings ?? new User.UserSettings();
        Token = null;
    }

    public AuthResponse(User user, string token) : this(user)
    {
        Token = token ?? string.Empty;
    }

    public string Id { get; }
    public string Username { get; }
    public string Email { get; }
    public SubscriptionInfo Subscription { get; }
    public string Role { get; }
    public User.UserProfile Profile { get; }
    public User.UserSettings Settings { get; }
    public string? Token { get; }
}
