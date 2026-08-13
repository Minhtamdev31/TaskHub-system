using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

// Đơn hàng cho màn Admin: kèm tên + email người mua (join từ User) để hiển thị & real-time.
public sealed class AdminOrderResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanTitle { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentGateway { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public AdminOrderResponse() { }

    public AdminOrderResponse(Order o, User? user)
    {
        Id = o.Id;
        UserId = o.UserId;
        UserName = !string.IsNullOrWhiteSpace(user?.Profile?.FullName)
            ? user!.Profile.FullName
            : (user?.Username ?? string.Empty);
        UserEmail = user?.Email ?? string.Empty;
        PlanId = o.PlanId;
        PlanTitle = o.PlanTitle;
        Amount = o.Amount;
        PaymentCode = o.PaymentCode;
        Status = o.Status;
        PaymentGateway = o.PaymentGateway;
        CreatedAt = o.CreatedAt;
        CompletedAt = o.CompletedAt;
    }
}
