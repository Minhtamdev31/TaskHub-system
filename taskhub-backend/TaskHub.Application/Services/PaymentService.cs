using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Text;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
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

        // Generates a unique 9-digit int based on daily time ticks
        int orderCode = int.Parse(DateTime.UtcNow.ToString("HHmmssfff"));

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

    public async Task<string> CreateMoMoPaymentUrlAsync(string userId, string planId, string returnUrl, string notifyUrl)
    {
        var plan = await _planRepository.GetByIdAsync(planId);
        if (plan == null) throw new Exception("Plan not found");

        string requestId = Guid.NewGuid().ToString();
        string orderId = DateTimeOffset.UtcNow.Ticks.ToString();

        var order = new Order
        {
            UserId = userId,
            PlanId = planId,
            PlanTitle = plan.Title,
            Amount = plan.Price,
            PaymentCode = orderId,
            PaymentGateway = "MoMo"
        };
        await _orderRepository.CreateAsync(order);

        var partnerCode = _config["MoMo:PartnerCode"];
        var accessKey = _config["MoMo:AccessKey"];
        var secretKey = _config["MoMo:SecretKey"];

        if (string.IsNullOrEmpty(partnerCode) || string.IsNullOrEmpty(accessKey) || string.IsNullOrEmpty(secretKey))
        {
            throw new Exception("Backend Error: Cannot read MoMo configuration from appsettings.json. Please verify your root 'MoMo' block.");
        }

        string orderInfo = $"Pay for {plan.Title}";
        string amount = ((int)plan.Price).ToString();
        string extraData = "";

        string rawHash = $"accessKey={accessKey}&amount={amount}&extraData={extraData}&ipnUrl={notifyUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={partnerCode}&redirectUrl={returnUrl}&requestId={requestId}&requestType=captureWallet";
        string signature = HmacSha256(rawHash, secretKey!);

        var requestBody = new
        {
            partnerCode,
            requestId,
            amount = int.Parse(amount),
            orderId,
            orderInfo,
            redirectUrl = returnUrl,
            ipnUrl = notifyUrl,
            extraData,
            requestType = "captureWallet",
            signature,
            lang = "vi"
        };

        var response = await _httpClient.PostAsJsonAsync("https://test-payment.momo.vn/v2/gateway/api/create", requestBody);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();

        return result.GetProperty("payUrl").GetString() ?? "";
    }

    public async Task<bool> ProcessPayOSWebhookAsync(HttpRequest request)
    {
        using var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(body);
        
        var data = json.GetProperty("data");
        var orderCode = data.GetProperty("orderCode").GetInt64().ToString();
        var code = json.GetProperty("code").GetString();

        if (code == "00")
        {
            return await CompleteSubscriptionOrder(orderCode);
        }
        return false;
    }

    public async Task<bool> ProcessMoMoIPNAsync(HttpRequest request)
    {
        // Simplification: In production, verify MoMo IPN signature here
        var orderId = request.Query["orderId"].ToString();
        var resultCode = request.Query["resultCode"].ToString();

        if (resultCode == "0")
        {
            return await CompleteSubscriptionOrder(orderId);
        }
        return false;
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