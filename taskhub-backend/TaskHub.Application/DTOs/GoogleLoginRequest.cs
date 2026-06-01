namespace TaskHub.Application.DTOs;

public sealed class GoogleLoginRequest
{
    public string IdToken { get; set; } = string.Empty;
}
