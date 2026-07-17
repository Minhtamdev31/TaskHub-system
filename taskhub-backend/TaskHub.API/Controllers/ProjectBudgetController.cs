using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

/// <summary>
/// Quản lý chi tiêu dự án (tính năng Premium, xét theo chủ dự án).
/// </summary>
[ApiController]
[Route("api/projects/{projectId}")]
[Authorize]
public class ProjectBudgetController : ControllerBase
{
    private readonly IBudgetService _budgetService;

    public ProjectBudgetController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    private string? CurrentUserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    /// <summary>Chuyển kết quả nghiệp vụ thành HTTP status phù hợp.</summary>
    private IActionResult ToResult(BudgetOperationResult result)
    {
        if (result.Success) return Ok(result.Request);

        // 403 + requiresUpgrade: frontend hiện UpgradePanel thay vì báo lỗi.
        if (result.RequiresUpgrade)
            return StatusCode(403, new { message = result.Error, requiresUpgrade = true });

        if (result.Forbidden) return StatusCode(403, new { message = result.Error });
        if (result.NotFound) return NotFound(new { message = result.Error });
        return BadRequest(new { message = result.Error });
    }

    [HttpGet("budget")]
    public async Task<IActionResult> GetBudget(string projectId)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var (data, error) = await _budgetService.GetBudgetAsync(projectId, userId);
        return data is not null ? Ok(data) : ToResult(error!);
    }

    [HttpPut("budget")]
    public async Task<IActionResult> SetBudget(string projectId, [FromBody] SetBudgetDto dto)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (dto is null) return BadRequest(new { message = "Dữ liệu không hợp lệ." });

        return ToResult(await _budgetService.SetBudgetAsync(projectId, userId, dto.Budget));
    }

    [HttpPost("budget-requests")]
    public async Task<IActionResult> CreateRequest(string projectId, [FromBody] CreateBudgetRequestDto dto)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        return ToResult(await _budgetService.CreateRequestAsync(projectId, userId, dto));
    }

    [HttpPost("budget-requests/{requestId}/approve")]
    public async Task<IActionResult> Approve(string projectId, string requestId)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        return ToResult(await _budgetService.ApproveAsync(projectId, requestId, userId));
    }

    [HttpPost("budget-requests/{requestId}/reject")]
    public async Task<IActionResult> Reject(string projectId, string requestId, [FromBody] RejectBudgetRequestDto dto)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (dto is null) return BadRequest(new { message = "Vui lòng nhập lý do không duyệt." });

        return ToResult(await _budgetService.RejectAsync(projectId, requestId, userId, dto.Reason));
    }
}
