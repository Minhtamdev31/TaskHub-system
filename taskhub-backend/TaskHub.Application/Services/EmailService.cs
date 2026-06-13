using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using TaskHub.Application.Interfaces;

namespace TaskHub.Application.Services;

/// <summary>
/// Gửi email qua Brevo HTTP API (https://api.brevo.com/v3/smtp/email).
/// Dùng HTTP thay vì SMTP vì các nền tảng hosting như Render chặn outbound SMTP (cổng 25/465/587).
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    private const string BrevoEndpoint = "https://api.brevo.com/v3/smtp/email";

    public EmailService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");

        var apiKey = emailSettings["BrevoApiKey"]?.Trim();
        var senderEmail = (emailSettings["SenderEmail"] ?? "no-reply@taskhub.com").Trim();
        var senderName = emailSettings["SenderName"] ?? "TaskHub Support";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Thiếu cấu hình EmailSettings:BrevoApiKey. Hãy đặt biến môi trường EmailSettings__BrevoApiKey trên server.");
        }

        var payload = new
        {
            sender = new { name = senderName, email = senderEmail },
            to = new[] { new { email = toEmail } },
            subject,
            htmlContent = htmlMessage
        };

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, BrevoEndpoint)
        {
            Content = JsonContent.Create(payload)
        };
        requestMessage.Headers.Add("api-key", apiKey);
        requestMessage.Headers.Add("accept", "application/json");

        var response = await client.SendAsync(requestMessage);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Brevo gửi email thất bại ({(int)response.StatusCode}): {body}");
        }
    }
}
