using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace TaskHub.Application.Interfaces;

public interface IPaymentService
{
    Task<string> CreatePayOSPaymentUrlAsync(string userId, string planId, string returnUrl, string cancelUrl);
    Task<string> CreateMoMoPaymentUrlAsync(string userId, string planId, string returnUrl, string notifyUrl);
    Task<bool> ProcessPayOSWebhookAsync(HttpRequest request);
    Task<bool> ProcessMoMoIPNAsync(HttpRequest request);
}