namespace TaskHub.Application.DTOs;

public sealed class VerifyRegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
}