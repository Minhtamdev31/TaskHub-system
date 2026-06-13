using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public sealed class UserLookupRequest
{
    public List<string> Ids { get; set; } = new();
}

public sealed class UserLookupResponse
{
    public UserLookupResponse(User user)
    {
        Id = user.Id ?? string.Empty;
        Username = user.Username ?? string.Empty;
        Email = user.Email ?? string.Empty;
        FullName = user.Profile?.FullName ?? string.Empty;
        AvatarUrl = user.Profile?.AvatarUrl ?? string.Empty;
    }

    public string Id { get; }
    public string Username { get; }
    public string Email { get; }
    public string FullName { get; }
    public string AvatarUrl { get; }
}
