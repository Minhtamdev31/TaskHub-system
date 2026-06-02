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

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
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

    [HttpGet("{id}/dashboard")]
    public async Task<IActionResult> GetProjectDashboard(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var dashboardDto = await _projectService.GetProjectDashboardAsync(id, userId);
        if (dashboardDto is null)
        {
            return BadRequest("Unauthorized or project not found.");
        }

        return Ok(dashboardDto);
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
