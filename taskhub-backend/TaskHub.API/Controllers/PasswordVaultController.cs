using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PasswordVaultController : ControllerBase
{
    private readonly IPasswordVaultService _vaultService;
    private readonly IUserService _userService;

    public PasswordVaultController(IPasswordVaultService vaultService, IUserService userService)
    {
        _vaultService = vaultService;
        _userService = userService;
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

    [HttpPost]
    public async Task<IActionResult> AddCredential([FromBody] AddCredentialDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (!await IsPremiumAsync(userId)) return UpgradeRequired();

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

        var credentials = await _vaultService.GetMyCredentialsAsync(userId);
        return Ok(credentials);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCredential(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest("Credential ID is required.");

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var success = await _vaultService.DeleteCredentialAsync(id, userId);
        if (!success)
        {
            return NotFound("Credential not found or you don't have permission to delete it.");
        }

        return NoContent();
    }
}
