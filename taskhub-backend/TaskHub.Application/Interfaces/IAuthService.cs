namespace TaskHub.Application.Interfaces;

public interface IAuthService
{
    Task<string?> GoogleLoginAsync(string idToken);
}
