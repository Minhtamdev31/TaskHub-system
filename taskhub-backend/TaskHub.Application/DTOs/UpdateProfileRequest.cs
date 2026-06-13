namespace TaskHub.Application.DTOs;

public sealed class UpdateProfileRequest
{
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? Theme { get; set; }
    public bool? EnableNotifications { get; set; }
}
