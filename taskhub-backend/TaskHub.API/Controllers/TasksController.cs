using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTasks()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var tasks = await _taskService.GetTasksByUserIdAsync(userId);
        var response = tasks.Select(task => new TaskResponse(task));
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTaskById(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var task = await _taskService.GetTaskByIdAsync(id);
        if (task is null)
        {
            return NotFound();
        }

        if (!task.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        return Ok(new TaskResponse(task));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.ProjectId))
        {
            return BadRequest("Title and ProjectId are required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var task = await _taskService.CreateTaskAsync(request, userId);
        if (task is null)
        {
            return BadRequest("Failed to create task.");
        }

        return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, new TaskResponse(task));
    }

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetTasksByProject(string projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId))
        {
            return BadRequest("ProjectId is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var tasks = await _taskService.GetTasksByProjectIdAsync(projectId, userId);
        var response = tasks.Select(task => new TaskResponse(task));
        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateTaskDto request)
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

        var success = await _taskService.UpdateTaskAsync(id, request, userId);
        if (!success)
        {
            return NotFound();
        }

        var updatedTask = await _taskService.GetTaskByIdAsync(id);
        return Ok(new TaskResponse(updatedTask!));
    }

    [HttpPut("{id}/assign")]
    public async Task<IActionResult> AssignTask(string id, [FromBody] AssignTaskDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.TargetUserId))
        {
            return BadRequest("TargetUserId is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _taskService.AssignTaskAsync(id, request, userId);
        if (!success)
        {
            return NotFound();
        }

        var updatedTask = await _taskService.GetTaskByIdAsync(id);
        return Ok(new TaskResponse(updatedTask!));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var success = await _taskService.DeleteTaskAsync(id, userId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
