using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;
using TaskHub.Application.Helpers;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PasswordVaultController : ControllerBase
{
    private readonly IPasswordVaultService _vaultService;
    private readonly IUserService _userService;
    private readonly IOtpService _otpService;
    private readonly string _vaultTokenKey;

    private const string VaultTokenHeader = "X-Vault-Token";

    public PasswordVaultController(
        IPasswordVaultService vaultService,
        IUserService userService,
        IOtpService otpService,
        IConfiguration configuration)
    {
        _vaultService = vaultService;
        _userService = userService;
        _otpService = otpService;
        _vaultTokenKey = configuration["Security:VaultEncryptionKey"]
                         ?? throw new InvalidOperationException("Vault encryption key is not configured.");
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return email;
        var parts = email.Split('@');
        var name = parts[0];
        var masked = name.Length <= 2 ? $"{name[0]}***" : $"{name[0]}***{name[^1]}";
        return $"{masked}@{parts[1]}";
    }

    private async Task<bool> IsPremiumAsync(string userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        return user?.Subscription?.IsActivePremium ?? false;
    }

    private IActionResult UpgradeRequired() =>
        StatusCode(403, new
        {
            message = "Password Vault là tính năng Premium. Vui lòng nâng cấp để sử dụng.",
            requiresUpgrade = true
        });

    // 423 Locked: chưa mở khóa bằng PIN (không dùng 401 để tránh tự đăng xuất ở frontend).
    private IActionResult VaultLocked() =>
        StatusCode(423, new
        {
            message = "Kho mật khẩu đang khóa. Vui lòng nhập mã PIN để mở khóa.",
            requiresVaultUnlock = true
        });

    private bool HasValidVaultToken(string userId)
    {
        var token = Request.Headers[VaultTokenHeader].ToString();
        return VaultTokenHelper.Validate(token, userId, _vaultTokenKey);
    }

    // ---------- PIN / Unlock ----------

    [HttpGet("pin/status")]
    public async Task<IActionResult> GetPinStatus()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        return Ok(new { hasPin = await _vaultService.HasPinAsync(userId) });
    }

    [HttpPost("pin/setup")]
    public async Task<IActionResult> SetupPin([FromBody] VaultPinDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        if (await _vaultService.HasPinAsync(userId))
            return BadRequest(new { message = "PIN đã được thiết lập. Hãy dùng chức năng đổi PIN." });

        if (!await _vaultService.SetPinAsync(userId, request?.Pin ?? string.Empty))
            return BadRequest(new { message = "PIN không hợp lệ (cần 4–12 chữ số)." });

        // Thiết lập xong thì mở khóa luôn cho mượt.
        return Ok(new { vaultToken = VaultTokenHelper.Create(userId, _vaultTokenKey), expiresInMinutes = VaultTokenHelper.LifetimeMinutes });
    }

    [HttpPost("unlock")]
    public async Task<IActionResult> Unlock([FromBody] VaultPinDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        if (!await _vaultService.VerifyPinAsync(userId, request?.Pin ?? string.Empty))
            return BadRequest(new { message = "Mã PIN không đúng." });

        return Ok(new { vaultToken = VaultTokenHelper.Create(userId, _vaultTokenKey), expiresInMinutes = VaultTokenHelper.LifetimeMinutes });
    }

    [HttpPut("pin/change")]
    public async Task<IActionResult> ChangePin([FromBody] ChangeVaultPinDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        if (!await _vaultService.ChangePinAsync(userId, request?.OldPin ?? string.Empty, request?.NewPin ?? string.Empty))
            return BadRequest(new { message = "Đổi PIN thất bại. Kiểm tra PIN cũ và PIN mới (4–12 chữ số)." });

        return Ok(new { message = "Đã đổi mã PIN." });
    }

    // --- Đổi PIN bằng OTP (không cần PIN cũ) ---

    [HttpPost("pin/change/request-otp")]
    public async Task<IActionResult> RequestChangePinOtp()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        var user = await _userService.GetByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
            return BadRequest(new { message = "Không tìm thấy email tài khoản." });

        await _otpService.GenerateAndSendOtpAsync(user.Email, "ChangePin");
        return Ok(new { message = "Đã gửi mã OTP tới email.", email = MaskEmail(user.Email) });
    }

    [HttpPost("pin/change/confirm")]
    public async Task<IActionResult> ConfirmChangePinOtp([FromBody] ChangePinOtpRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

        if (request is null || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPin))
            return BadRequest(new { message = "Cần mã OTP và PIN mới." });

        var user = await _userService.GetByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
            return BadRequest(new { message = "Không tìm thấy email tài khoản." });

        if (!await _otpService.VerifyOtpAsync(user.Email, request.Otp, "ChangePin"))
            return BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });

        if (!await _vaultService.ResetPinAsync(userId, request.NewPin))
            return BadRequest(new { message = "PIN mới không hợp lệ (cần 4–12 chữ số)." });

        return Ok(new { message = "Đã đổi mã PIN." });
    }

    // ---------- Dữ liệu (yêu cầu Premium + đã mở khóa PIN) ----------

    [HttpPost]
    public async Task<IActionResult> AddCredential([FromBody] AddCredentialDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();
        if (!HasValidVaultToken(userId)) return VaultLocked();

        if (request is null || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Title and Password are required.");
        }

        var success = await _vaultService.AddCredentialAsync(userId, request);
        if (!success) return BadRequest("Failed to store credential.");

        return Ok(new { message = "Credential stored securely." });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyCredentials()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();
        if (!HasValidVaultToken(userId)) return VaultLocked();

        var credentials = await _vaultService.GetMyCredentialsAsync(userId);
        return Ok(credentials);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCredential(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest("Credential ID is required.");

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (!await IsPremiumAsync(userId)) return UpgradeRequired();
        if (!HasValidVaultToken(userId)) return VaultLocked();

        var success = await _vaultService.DeleteCredentialAsync(id, userId);
        if (!success)
        {
            return NotFound("Credential not found or you don't have permission to delete it.");
        }

        return NoContent();
    }
}
