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

    public PasswordVaultController(IPasswordVaultService vaultService)
    {
        _vaultService = vaultService;
    }

    [HttpPost]
    public async Task<IActionResult> AddCredential([FromBody] AddCredentialDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

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