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

    [HttpPost("checkout/momo")]
    [Authorize]
    public async Task<IActionResult> CheckoutMoMo([FromBody] CreatePaymentRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var url = await _paymentService.CreateMoMoPaymentUrlAsync(userId, request.PlanId, request.ReturnUrl, request.CancelUrl);
        return Ok(new { payUrl = url });
    }

    [HttpPost("webhook/payos")]
    public async Task<IActionResult> PayOSWebhook()
    {
        var success = await _paymentService.ProcessPayOSWebhookAsync(Request);
        if (success) return Ok();
        return BadRequest();
    }

    [HttpPost("webhook/momo")]
    public async Task<IActionResult> MoMoIPN()
    {
        var success = await _paymentService.ProcessMoMoIPNAsync(Request);
        if (success) return Ok();
        return BadRequest();
    }
}