using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IUserService _userService;
    private readonly IAiService _aiService;

    public ProjectsController(IProjectService projectService, IUserService userService, IAiService aiService)
    {
        _projectService = projectService;
        _userService = userService;
        _aiService = aiService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Project name is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var project = await _projectService.CreateProjectAsync(request, userId);
        if (project is null)
        {
            return BadRequest("Failed to create project.");
        }

        return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, new ProjectResponse(project));
    }

    [HttpGet]
    public async Task<IActionResult> GetAllProjects()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var projects = await _projectService.GetProjectsForUserAsync(userId);
        var response = projects.Select(project => new ProjectResponse(project));
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var project = await _projectService.GetProjectByIdAsync(id);
        if (project is null)
        {
            return NotFound();
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isMember)
        {
            return Forbid();
        }

        return Ok(new ProjectResponse(project));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] UpdateProjectDto request)
    {
        if (request is null)
        {
            return BadRequest("Update data is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.UpdateProjectAsync(id, request, userId);
        if (!success)
        {
            return NotFound();
        }

        var updatedProject = await _projectService.GetProjectByIdAsync(id);
        return Ok(new ProjectResponse(updatedProject!));
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(string id, [FromBody] AddMemberDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.AddMemberToProjectAsync(id, request, userId);
        if (!success)
        {
            return NotFound();
        }

        var updatedProject = await _projectService.GetProjectByIdAsync(id);
        return Ok(new ProjectResponse(updatedProject!));
    }

    [HttpDelete("{id}/members/{memberUserId}")]
    public async Task<IActionResult> RemoveMember(string id, string memberUserId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.RemoveMemberFromProjectAsync(id, memberUserId, userId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPut("{id}/members/role")]
    public async Task<IActionResult> ChangeMemberRole(string id, [FromBody] ChangeRoleDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.TargetUserId) || string.IsNullOrWhiteSpace(request.NewProjectRole))
        {
            return BadRequest("TargetUserId and NewProjectRole are required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.ChangeMemberRoleAsync(id, request, userId);
        if (!success)
        {
            return BadRequest("Unauthorized or invalid operation. Only the project owner or a leader can change member roles, and the owner's role cannot be changed.");
        }

        var updatedProject = await _projectService.GetProjectByIdAsync(id);
        return Ok(new ProjectResponse(updatedProject!));
    }

    [HttpPut("{id}/transfer-owner")]
    public async Task<IActionResult> TransferOwnership(string id, [FromBody] TransferOwnershipDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.NewOwnerUserId))
        {
            return BadRequest("NewOwnerUserId is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.TransferOwnershipAsync(id, request.NewOwnerUserId, userId);
        if (!success)
        {
            return BadRequest("Unauthorized or invalid operation. Only the current owner can transfer ownership to an existing member.");
        }

        var updatedProject = await _projectService.GetProjectByIdAsync(id);
        return Ok(new ProjectResponse(updatedProject!));
    }

    [HttpGet("{id}/dashboard")]
    public async Task<IActionResult> GetProjectDashboard(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var user = await _userService.GetByIdAsync(userId);
        if (!(user?.Subscription?.IsActivePremium ?? false))
        {
            return StatusCode(403, new
            {
                message = "Project Analytics là tính năng Premium. Vui lòng nâng cấp để xem báo cáo chi tiết.",
                requiresUpgrade = true
            });
        }

        var dashboardDto = await _projectService.GetProjectDashboardAsync(id, userId);
        if (dashboardDto is null)
        {
            return BadRequest("Unauthorized or project not found.");
        }

        return Ok(dashboardDto);
    }

    [HttpGet("{id}/ai-summary")]
    public async Task<IActionResult> GetProjectAiSummary(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var user = await _userService.GetByIdAsync(userId);
        if (!(user?.Subscription?.IsActivePremium ?? false))
        {
            return StatusCode(403, new
            {
                message = "Tóm tắt AI là tính năng Premium. Vui lòng nâng cấp để sử dụng.",
                requiresUpgrade = true
            });
        }

        try
        {
            var summary = await _aiService.SummarizeProjectAsync(id, userId);
            if (summary is null)
            {
                return BadRequest("Unauthorized or project not found.");
            }

            return Ok(new ProjectSummaryResponse { Summary = summary });
        }
        catch (InvalidOperationException)
        {
            // API key chưa cấu hình
            return StatusCode(503, new { message = "Dịch vụ AI chưa được cấu hình trên máy chủ." });
        }
        catch (Exception)
        {
            return StatusCode(502, new { message = "Không tạo được tóm tắt. Vui lòng thử lại sau." });
        }
    }

    [HttpGet("{id}/member-contributions")]
    public async Task<IActionResult> GetMemberContributions(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var contributions = await _projectService.GetMemberContributionsAsync(id, userId);
        // Returns an empty list if project not found or unauthorized as per service logic
        return Ok(contributions);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _projectService.DeleteProjectAsync(id, userId);
        if (!success)
        {
            return BadRequest("Unauthorized or invalid operation. Only the project owner can delete the project.");
        }

        return Ok(new { message = "Project and all associated tasks have been successfully deleted." });
    }
}
