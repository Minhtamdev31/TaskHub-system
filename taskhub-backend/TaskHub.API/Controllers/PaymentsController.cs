using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskHub.Application.Interfaces;
using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

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
        // Service tự bỏ qua webhook không khớp đơn nào (kể cả webhook test/xác minh URL
        // của PayOS), nên ở đây cứ xử lý rồi luôn trả về error:0 để PayOS chấp nhận.
        try
        {
            await _paymentService.ProcessPayOSWebhookAsync(Request);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PayOS Webhook Error]: {ex.Message}");
        }

        return Ok(new { error = 0, message = "Ok" });
    }

    [HttpGet("payos/confirm/{orderCode}")]
    [Authorize]
    public async Task<IActionResult> ConfirmPayOS(string orderCode)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var completed = await _paymentService.ConfirmPayOSOrderAsync(orderCode, userId);
        return Ok(new { completed });
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
    public async Task<IActionResult> GetAllOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = page < 1 ? 1 : page;
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (orders, total) = await _paymentService.GetAllOrdersForAdminPagedAsync(page, pageSize);
        return Ok(new PagedResult<Order>
        {
            Items = orders,
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("admin/dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminDashboard()
    {
        var analytics = await _paymentService.GetAdminDashboardAnalyticsAsync();
        return Ok(analytics);
    }
}