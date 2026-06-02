namespace TaskHub.Application.Interfaces;

public interface IOtpService
{
    Task<string> GenerateAndSendOtpAsync(string email, string type);
    Task<bool> VerifyOtpAsync(string email, string otpCode, string type);
}