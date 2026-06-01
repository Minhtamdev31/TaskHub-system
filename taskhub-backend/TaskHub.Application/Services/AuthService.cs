using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserService _userService;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _configuration;

    public AuthService(IUserService userService, ITokenService tokenService, IConfiguration configuration)
    {
        _userService = userService;
        _tokenService = tokenService;
        _configuration = configuration;
    }

    public async Task<string?> GoogleLoginAsync(string idToken)
    {
        try
        {
            var googleClientId = _configuration["Google:ClientId"];
            if (string.IsNullOrEmpty(googleClientId))
            {
                return null;
            }

            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { googleClientId }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

            var email = payload.Email;
            var name = payload.Name;
            var picture = payload.Picture;

            var existingUser = await _userService.GetByEmailAsync(email);

            User user;
            if (existingUser is null)
            {
                user = new User
                {
                    Username = name ?? email.Split('@')[0],
                    Email = email,
                    PasswordHash = string.Empty,
                    Role = "User",
                    Subscription = SubscriptionInfo.FreeActive,
                    Profile = new User.UserProfile
                    {
                        FullName = name ?? string.Empty,
                        AvatarUrl = picture ?? string.Empty,
                        Bio = string.Empty,
                        PhoneNumber = string.Empty,
                        JobTitle = string.Empty
                    },
                    Settings = new User.UserSettings
                    {
                        Theme = "Light",
                        Language = "en",
                        EnableNotifications = true
                    },
                    CreatedAt = DateTime.UtcNow
                };

                await _userService.CreateAsync(user);
            }
            else
            {
                user = existingUser;
            }

            var token = _tokenService.GenerateToken(user);
            return token;
        }
        catch (Exception)
        {
            return null;
        }
    }
}
