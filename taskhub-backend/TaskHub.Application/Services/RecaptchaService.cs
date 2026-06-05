using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using TaskHub.Application.Interfaces;

namespace TaskHub.Application.Services;

public class RecaptchaService(IHttpClientFactory httpClientFactory, IConfiguration configuration) : IRecaptchaService
{
    private class RecaptchaResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
    }

    public async Task<bool> VerifyTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        try
        {
            var secretKey = configuration["Recaptcha:SecretKey"];
            if (string.IsNullOrEmpty(secretKey))
            {
                Console.WriteLine("[Recaptcha Error]: SecretKey is missing in configuration.");
                return false;
            }

            var client = httpClientFactory.CreateClient();
            var url = $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}";
            
            var response = await client.PostAsync(url, null);
            var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>();
            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Recaptcha Error]: {ex.Message}");
            return false;
        }
    }
}