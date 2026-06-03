using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskHub.Application.Interfaces;
using TaskHub.Application.DTOs;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionPlansController : ControllerBase
{
    private readonly ISubscriptionPlanService _planService;

    public SubscriptionPlansController(ISubscriptionPlanService planService)
    {
        _planService = planService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivePlans()
    {
        return Ok(await _planService.GetActivePlansAsync());
    }

    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllPlans()
    {
        return Ok(await _planService.GetAllPlansAsync());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanDto request)
    {
        var plan = await _planService.CreatePlanAsync(request);
        return Ok(plan);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdatePlan(string id, [FromBody] CreateSubscriptionPlanDto request)
    {
        var success = await _planService.UpdatePlanAsync(id, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePlan(string id)
    {
        var success = await _planService.DeletePlanAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}