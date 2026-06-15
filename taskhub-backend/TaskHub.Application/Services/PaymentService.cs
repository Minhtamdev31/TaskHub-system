using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Text;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IMongoRepository<Order> _orderRepository;
    private readonly IMongoRepository<SubscriptionPlan> _planRepository;
    private readonly IMongoRepository<User> _userRepository;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public PaymentService(
        IMongoRepository<Order> orderRepository,
        IMongoRepository<SubscriptionPlan> planRepository,
        IMongoRepository<User> userRepository,
        IConfiguration config,
        HttpClient httpClient)
    {
        _orderRepository = orderRepository;
        _planRepository = planRepository;
        _userRepository = userRepository;
        _config = config;
        _httpClient = httpClient;
    }

    public async Task<string> CreatePayOSPaymentUrlAsync(string userId, string planId, string returnUrl, string cancelUrl)
    {
        var plan = await _planRepository.GetByIdAsync(planId);
        if (plan == null) throw new Exception("Plan not found");

        // Mốc thời gian Unix theo mili-giây: duy nhất xuyên ngày nên không bị PayOS từ chối
        // vì trùng orderCode (lỗi cũ chỉ mã hóa giờ-phút-giây nên trùng giữa các ngày).
        long orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        int amount = (int)plan.Price;
        // Ensure description contains only standard alphanumeric characters and spaces
        string sanitizedName = Regex.Replace(plan.Name, @"[^a-zA-Z0-9 ]", "");
        string description = $"Thanh toan {sanitizedName}";

        var order = new Order
        {
            UserId = userId,
            PlanId = planId,
            PlanTitle = plan.Title,
            Amount = amount,
            PaymentCode = orderCode.ToString(),
            PaymentGateway = "PayOS"
        };
        await _orderRepository.CreateAsync(order);

        var clientId = _config["PayOS:ClientId"];
        var apiKey = _config["PayOS:ApiKey"];
        var checksumKey = _config["PayOS:ChecksumKey"];

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(checksumKey))
        {
            throw new Exception("Backend Error: Cannot read PayOS configuration from appsettings.json. Please verify your root 'PayOS' block.");
        }

        string signatureData = $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}";
        string signature = HmacSha256(signatureData, checksumKey!);

        var requestBody = new { 
            orderCode, 
            amount, 
            description, 
            cancelUrl, 
            returnUrl, 
            signature 
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("x-client-id", clientId);
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);

        var response = await _httpClient.PostAsJsonAsync("https://api-merchant.payos.vn/v2/payment-requests", requestBody);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        
        // Safe check on response code before accessing data
        string responseCode = result.GetProperty("code").GetString() ?? string.Empty;
        if (responseCode != "00")
        {
            string errorDesc = result.GetProperty("desc").GetString() ?? "Unknown error from PayOS";
            throw new Exception($"PayOS Checkout Error: {errorDesc} (Code: {responseCode})");
        }

        return result.GetProperty("data").GetProperty("checkoutUrl").GetString() ?? "";
    }

    public async Task<bool> ProcessPayOSWebhookAsync(HttpRequest request)
    {
        using var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(body);

        if (!json.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
        {
            // Webhook xác minh URL của PayOS không có "data" → bỏ qua, không lỗi.
            return false;
        }

        // BẮT BUỘC xác minh chữ ký: nếu không, bất kỳ ai cũng có thể giả webhook để
        // tự nâng cấp Premium miễn phí. PayOS ký HMAC-SHA256 trên các trường của "data"
        // sắp xếp theo tên khóa, dùng ChecksumKey.
        var checksumKey = _config["PayOS:ChecksumKey"];
        if (string.IsNullOrEmpty(checksumKey))
        {
            return false;
        }

        var receivedSignature = json.TryGetProperty("signature", out var sigEl) ? sigEl.GetString() : null;
        var expectedSignature = HmacSha256(BuildWebhookSignatureData(data), checksumKey);
        if (string.IsNullOrEmpty(receivedSignature) ||
            !string.Equals(receivedSignature, expectedSignature, StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine("[PayOS Webhook] Chữ ký không hợp lệ — bỏ qua đơn giả mạo.");
            return false;
        }

        var orderCode = data.GetProperty("orderCode").GetInt64().ToString();
        var code = json.GetProperty("code").GetString();

        if (code == "00")
        {
            return await CompleteSubscriptionOrder(orderCode);
        }
        return false;
    }

    // Ghép chuỗi ký theo chuẩn PayOS: các trường của "data" sắp xếp tăng dần theo tên khóa,
    // nối thành "key=value&key2=value2..." (giá trị null → rỗng).
    private static string BuildWebhookSignatureData(JsonElement data)
    {
        var pairs = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var prop in data.EnumerateObject())
        {
            pairs[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
                JsonValueKind.String => prop.Value.GetString() ?? string.Empty,
                _ => prop.Value.GetRawText()
            };
        }
        return string.Join("&", pairs.Select(p => $"{p.Key}={p.Value}"));
    }

    // Xác nhận đơn ngay khi người dùng được redirect về (không phụ thuộc webhook).
    // Hỏi trực tiếp PayOS trạng thái đơn theo orderCode; nếu PAID thì hoàn tất.
    public async Task<bool> ConfirmPayOSOrderAsync(string orderCode, string userId)
    {
        if (string.IsNullOrWhiteSpace(orderCode) || string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        var orders = await _orderRepository.GetAllAsync();
        var order = orders.FirstOrDefault(o => o.PaymentCode == orderCode && o.UserId == userId);
        if (order == null) return false;
        if (order.Status == "Completed") return true; // đã hoàn tất trước đó (vd webhook đã chạy)

        var clientId = _config["PayOS:ClientId"];
        var apiKey = _config["PayOS:ApiKey"];
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(apiKey))
        {
            return false;
        }

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("x-client-id", clientId);
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);

        var response = await _httpClient.GetAsync($"https://api-merchant.payos.vn/v2/payment-requests/{orderCode}");
        if (!response.IsSuccessStatusCode) return false;

        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (result.GetProperty("code").GetString() != "00") return false;

        var status = result.GetProperty("data").GetProperty("status").GetString();
        if (status != "PAID") return false;

        return await CompleteSubscriptionOrder(orderCode);
    }

    public async Task<List<Order>> GetOrdersByUserIdAsync(string userId)
    {
        var all = await _orderRepository.GetAllAsync();
        return all.Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt).ToList();
    }

    public async Task<List<Order>> GetAllOrdersForAdminAsync()
    {
        var all = await _orderRepository.GetAllAsync();
        return all.OrderByDescending(o => o.CreatedAt).ToList();
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAnalyticsAsync()
    {
        var allOrders = await _orderRepository.GetAllAsync();
        var completedOrders = allOrders.Where(o => o.Status == "Completed").ToList();

        var dashboard = new AdminDashboardDto
        {
            TotalRevenue = completedOrders.Sum(o => o.Amount),
            TotalSuccessTransactions = completedOrders.Count,
            PlanBreakdown = completedOrders
                .GroupBy(o => o.PlanTitle)
                .ToDictionary(g => g.Key ?? "Unknown", g => g.Count()),
            RecentOrders = completedOrders
                .OrderByDescending(o => o.CompletedAt ?? o.CreatedAt)
                .Take(10)
                .ToList()
        };

        return dashboard;
    }

    private async Task<bool> CompleteSubscriptionOrder(string paymentCode)
    {
        var orders = await _orderRepository.GetAllAsync();
        var order = orders.FirstOrDefault(o => o.PaymentCode == paymentCode && o.Status == "Pending");
        if (order == null) return false;

        var plan = await _planRepository.GetByIdAsync(order.PlanId);
        var user = await _userRepository.GetByIdAsync(order.UserId);
        if (plan == null || user == null) return false;

        // Update Order
        order.Status = "Completed";
        order.CompletedAt = DateTime.UtcNow;
        await _orderRepository.UpdateAsync(order.Id, order);

        // Update User Subscription
        user.Subscription.Plan = plan.Name;
        user.Subscription.IsPremium = true;
        
        var currentExp = user.Subscription.PremiumUntil ?? DateTime.UtcNow;
        if (currentExp < DateTime.UtcNow) currentExp = DateTime.UtcNow;
        
        user.Subscription.PremiumUntil = currentExp.AddDays(plan.DurationDays);
        user.Subscription.EndDate = user.Subscription.PremiumUntil;
        user.Role = "PremiumMember"; // Optional Role upgrade

        await _userRepository.UpdateAsync(user.Id, user);
        return true;
    }

    private static string HmacSha256(string data, string key)
    {
        byte[] keyByte = Encoding.UTF8.GetBytes(key);
        byte[] messageBytes = Encoding.UTF8.GetBytes(data);
        using var hmacsha256 = new HMACSHA256(keyByte);
        byte[] hashmessage = hmacsha256.ComputeHash(messageBytes);
        return Convert.ToHexString(hashmessage).ToLower();
    }
}