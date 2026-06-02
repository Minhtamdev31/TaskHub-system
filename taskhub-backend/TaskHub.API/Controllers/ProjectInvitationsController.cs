using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectInvitationsController : ControllerBase
{
    private readonly IProjectInvitationService _invitationService;

    public ProjectInvitationsController(IProjectInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    [HttpPost("invite")]
    public async Task<IActionResult> InviteUser([FromBody] InviteRequest request)
    {
        var inviterId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(inviterId)) return Unauthorized();

        var success = await _invitationService.SendInvitationAsync(request.ProjectId, inviterId, request.InvitedEmail);
        if (!success)
        {
            return BadRequest("Failed to send invitation. Project may not exist or invitation already pending.");
        }

        return Ok(new { message = "Invitation sent successfully." });
    }

    [HttpGet("my-invitations")]
    public async Task<IActionResult> GetMyInvitations()
    {
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(userEmail)) return Unauthorized();

        var invitations = await _invitationService.GetPendingInvitationsAsync(userEmail);
        return Ok(invitations);
    }

    [HttpPost("{id}/respond")]
    public async Task<IActionResult> Respond(string id, [FromBody] RespondInvitationRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userEmail)) 
            return Unauthorized();

        var success = await _invitationService.RespondToInvitationAsync(id, userId, userEmail, request.Accept);
        if (!success)
        {
            return BadRequest("Invalid invitation or unauthorized.");
        }

        string action = request.Accept ? "accepted" : "rejected";
        return Ok(new { message = $"Invitation {action} successfully." });
    }
}