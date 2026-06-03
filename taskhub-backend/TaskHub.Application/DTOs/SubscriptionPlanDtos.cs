using System.Collections.Generic;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public class CreateSubscriptionPlanDto
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class CreatePaymentRequest
{
    public string PlanId { get; set; } = string.Empty;
    public string ReturnUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty; // Also used as notifyUrl for MoMo
}

public class AdminDashboardDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalSuccessTransactions { get; set; }
    public Dictionary<string, int> PlanBreakdown { get; set; } = new();
    public List<Order> RecentOrders { get; set; } = new();
}