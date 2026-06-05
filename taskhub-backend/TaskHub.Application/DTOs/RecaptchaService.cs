using System.Net.Http;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Threading.Tasks;
using System; 
using TaskHub.Application.Interfaces;

namespace TaskHub.Persistence.Services;

public class RecaptchaService : IRecaptchaService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public RecaptchaService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<bool> VerifyTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        try
        {
            var secretKey = _configuration["Recaptcha:SecretKey"];
            var client = _httpClientFactory.CreateClient();
            var url = $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}";

            var response = await client.PostAsync(url, null);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            using var jsonDoc = JsonDocument.Parse(content);
            
            return jsonDoc.RootElement.GetProperty("success").GetBoolean();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[reCAPTCHA Error]: {ex.Message}");
            return false;
        }
    }
}