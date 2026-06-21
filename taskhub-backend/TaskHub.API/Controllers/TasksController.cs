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
    private readonly IAiService _aiService;
    private readonly IUserService _userService;

    public TasksController(ITaskService taskService, IAiService aiService, IUserService userService)
    {
        _taskService = taskService;
        _aiService = aiService;
        _userService = userService;
    }

    // Kiểm tra Premium; trả null nếu OK, hoặc IActionResult 403 nếu không phải Premium.
    private async Task<IActionResult?> RequirePremiumAsync(string userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        if (!(user?.Subscription?.IsActivePremium ?? false))
        {
            return StatusCode(403, new { message = "Tính năng AI dành cho gói Premium. Vui lòng nâng cấp để sử dụng.", requiresUpgrade = true });
        }
        return null;
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

    [HttpGet("workspace")]
    public async Task<IActionResult> GetWorkspace()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var tasks = await _taskService.GetWorkspaceTasksAsync(userId);
        return Ok(tasks);
    }

    // Tóm tắt công việc của tôi bằng AI (Dashboard) — chỉ Premium.
    [HttpGet("ai-summary")]
    public async Task<IActionResult> GetMyWorkAiSummary()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User ID not found in token.");

        var gate = await RequirePremiumAsync(userId);
        if (gate is not null) return gate;

        try
        {
            var summary = await _aiService.SummarizeMyWorkAsync(userId);
            if (summary is null) return Ok(new { summary = "Bạn chưa có công việc nào để tóm tắt." });
            return Ok(new { summary });
        }
        catch (InvalidOperationException)
        {
            return StatusCode(503, new { message = "Dịch vụ AI chưa được cấu hình trên máy chủ." });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "Không tạo được tóm tắt: " + ex.Message });
        }
    }

    // Phân tích 1 task bằng AI (có cache) — chỉ Premium.
    [HttpGet("{id}/ai-analysis")]
    public async Task<IActionResult> GetTaskAiAnalysis(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User ID not found in token.");

        var gate = await RequirePremiumAsync(userId);
        if (gate is not null) return gate;

        try
        {
            var analysis = await _aiService.AnalyzeTaskAsync(id, userId);
            if (analysis is null) return NotFound(new { message = "Không tìm thấy task hoặc bạn không có quyền." });
            return Ok(new { analysis });
        }
        catch (InvalidOperationException)
        {
            return StatusCode(503, new { message = "Dịch vụ AI chưa được cấu hình trên máy chủ." });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "Không phân tích được: " + ex.Message });
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var stats = await _taskService.GetDashboardStatsAsync(userId);
        return Ok(stats);
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

        // Kiểm tra quyền: Người được giao việc HOẶC người có quyền truy cập dự án (Owner/Member)
        var tasksInProject = await _taskService.GetTasksByProjectIdAsync(task.ProjectId, userId);
        bool hasProjectAccess = tasksInProject.Any(t => t.Id == id);

        var isAssignee = task.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase);

        if (!isAssignee && !hasProjectAccess)
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
