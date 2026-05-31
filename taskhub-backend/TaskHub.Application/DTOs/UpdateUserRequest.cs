namespace TaskHub.Application.DTOs;

public sealed class UpdateUserRequest
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsEmailVerified { get; set; }

    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }

    public string? Theme { get; set; }
    public string? Language { get; set; }
    public bool? EnableNotifications { get; set; }
}
