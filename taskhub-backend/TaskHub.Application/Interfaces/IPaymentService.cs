using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface IPaymentService
{
    Task<string> CreatePayOSPaymentUrlAsync(string userId, string planId, string returnUrl, string cancelUrl);
    Task<bool> ProcessPayOSWebhookAsync(HttpRequest request);
    Task<bool> ConfirmPayOSOrderAsync(string orderCode, string userId);
    Task<bool> CancelPendingOrderAsync(string orderCode, string userId);
    Task<int> ExpireStalePendingOrdersAsync(TimeSpan olderThan);
    Task<List<Order>> GetOrdersByUserIdAsync(string userId);
    Task<List<Order>> GetAllOrdersForAdminAsync();
    Task<(List<Order> Items, long Total)> GetAllOrdersForAdminPagedAsync(int page, int pageSize);
    Task<AdminDashboardDto> GetAdminDashboardAnalyticsAsync();
}