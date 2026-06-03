using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.Interfaces;
using TaskHub.Application.DTOs;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost("checkout/payos")]
    [Authorize]
    public async Task<IActionResult> CheckoutPayOS([FromBody] CreatePaymentRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var url = await _paymentService.CreatePayOSPaymentUrlAsync(userId, request.PlanId, request.ReturnUrl, request.CancelUrl);
        return Ok(new { checkoutUrl = url });
    }

    [HttpPost("webhook/payos")]
    public async Task<IActionResult> PayOSWebhook()
    {
        var success = await _paymentService.ProcessPayOSWebhookAsync(Request);
        if (success) return Ok();
        return BadRequest();
    }

    [HttpGet("my-orders")]
    [Authorize]
    public async Task<IActionResult> GetMyOrders()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var orders = await _paymentService.GetOrdersByUserIdAsync(userId);
        return Ok(orders);
    }

    [HttpGet("admin/orders")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllOrders()
    {
        var orders = await _paymentService.GetAllOrdersForAdminAsync();
        return Ok(orders);
    }

    [HttpGet("admin/dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminDashboard()
    {
        var analytics = await _paymentService.GetAdminDashboardAnalyticsAsync();
        return Ok(analytics);
    }
}