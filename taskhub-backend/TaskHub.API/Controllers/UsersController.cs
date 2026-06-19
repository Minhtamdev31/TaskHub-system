using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IOtpService _otpService;

    public UsersController(IUserService userService, IOtpService otpService)
    {
        _userService = userService;
        _otpService = otpService;
    }

    // Che bớt email: "john@university.edu" -> "j***n@university.edu".
    private static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return email;
        var parts = email.Split('@');
        var name = parts[0];
        var masked = name.Length <= 2 ? $"{name[0]}***" : $"{name[0]}***{name[^1]}";
        return $"{masked}@{parts[1]}";
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (users, total) = await _userService.GetPagedAsync(page, pageSize);
        return Ok(new PagedResult<AuthResponse>
        {
            Items = users.Select(user => new AuthResponse(user)).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(user));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
    {
        if (request is null)
        {
            return BadRequest("Update data is required.");
        }

        if (request.Email is not null && string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email cannot be empty when provided.");
        }

        var updatedUser = await _userService.UpdateAsync(id, request);
        if (updatedUser is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(updatedUser));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!await _userService.DeleteAsync(id))
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("{id}/grant-premium")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GrantPremium(string id, [FromBody] GrantPremiumRequest? request)
    {
        var user = await _userService.SetSubscriptionAsync(id, true, request?.DurationDays ?? 30);
        if (user is null) return NotFound();
        return Ok(new AuthResponse(user));
    }

    [HttpPost("{id}/revoke-premium")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RevokePremium(string id)
    {
        var user = await _userService.SetSubscriptionAsync(id, false, 0);
        if (user is null) return NotFound();
        return Ok(new AuthResponse(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var user = await _userService.GetByIdAsync(userId);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(user));
    }

    [HttpGet("{id}/profile")]
    [Authorize]
    public async Task<IActionResult> GetPublicProfile(string id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new PublicProfileResponse(user));
    }

    [HttpPost("lookup")]
    [Authorize]
    public async Task<IActionResult> Lookup([FromBody] UserLookupRequest request)
    {
        if (request?.Ids is null || request.Ids.Count == 0)
        {
            return Ok(Array.Empty<UserLookupResponse>());
        }

        var idSet = request.Ids
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var allUsers = await _userService.GetAllAsync();
        var response = allUsers
            .Where(u => u.Id is not null && idSet.Contains(u.Id))
            .Select(u => new UserLookupResponse(u));

        return Ok(response);
    }

    [HttpPut("me/profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (request is null)
        {
            return BadRequest("Profile data is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var updateRequest = new UpdateUserRequest
        {
            FullName = request.FullName,
            AvatarUrl = request.AvatarUrl,
            Bio = request.Bio,
            PhoneNumber = request.PhoneNumber,
            JobTitle = request.JobTitle,
            Theme = request.Theme,
            EnableNotifications = request.EnableNotifications
        };

        var updatedUser = await _userService.UpdateAsync(userId, updateRequest);
        if (updatedUser is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(updatedUser));
    }

    [HttpPut("me/change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request is null)
        {
            return BadRequest("Password data is required.");
        }

        if (string.IsNullOrWhiteSpace(request.OldPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest("Old password and new password are required.");
        }

        if (request.OldPassword == request.NewPassword)
        {
            return BadRequest("New password must be different from old password.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var user = await _userService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword);
        if (user is null)
        {
            return Unauthorized("Invalid old password.");
        }

        return Ok(new { message = "Password changed successfully." });
    }

    // --- Đổi mật khẩu bằng OTP (không cần mật khẩu cũ) ---

    [HttpPost("me/change-password/request-otp")]
    [Authorize]
    public async Task<IActionResult> RequestChangePasswordOtp()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User ID not found in token.");

        var user = await _userService.GetByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new { message = "Không tìm thấy email tài khoản." });
        }

        await _otpService.GenerateAndSendOtpAsync(user.Email, "ChangePassword");
        return Ok(new { message = "Đã gửi mã OTP tới email.", email = MaskEmail(user.Email) });
    }

    [HttpPost("me/change-password/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmChangePasswordOtp([FromBody] ChangePasswordOtpRequest request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Cần mã OTP và mật khẩu mới." });
        }
        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "Mật khẩu mới cần tối thiểu 6 ký tự." });
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User ID not found in token.");

        var user = await _userService.GetByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new { message = "Không tìm thấy email tài khoản." });
        }

        if (!await _otpService.VerifyOtpAsync(user.Email, request.Otp, "ChangePassword"))
        {
            return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });
        }

        await _userService.SetPasswordAsync(userId, request.NewPassword);
        return Ok(new { message = "Đã đổi mật khẩu." });
    }
}
