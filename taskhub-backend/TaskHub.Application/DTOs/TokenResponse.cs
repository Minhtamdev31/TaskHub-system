namespace TaskHub.Application.DTOs;

public sealed class TokenResponse
{
    public TokenResponse(string token)
    {
        Token = token ?? string.Empty;
    }

    public string Token { get; }
}
