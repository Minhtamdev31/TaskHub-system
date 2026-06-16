using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class OtpService : IOtpService
{
    private readonly IMongoRepository<OtpRecord> _otpRepository;
    private readonly IEmailService _emailService;

    public OtpService(IMongoRepository<OtpRecord> otpRepository, IEmailService emailService)
    {
        _otpRepository = otpRepository;
        _emailService = emailService;
    }

    public async Task<string> GenerateAndSendOtpAsync(string email, string type)
    {
        var otpCode = new Random().Next(100000, 999999).ToString();
        var record = new OtpRecord
        {
            Email = (email ?? string.Empty).Trim().ToLowerInvariant(),
            OtpCode = otpCode,
            Type = type,
            ExpiryTime = DateTime.UtcNow.AddMinutes(5)
        };

        await _otpRepository.CreateAsync(record);

        var subject = type == "ResetPassword" ? "Reset Your TaskHub Password" : "Verify Your TaskHub Account";
        var htmlContent = $"<h3>TaskHub Verification</h3><p>Your OTP code is: <strong>{otpCode}</strong></p><p>This code expires in 5 minutes.</p>";

        await _emailService.SendEmailAsync(email, subject, htmlContent);
        return otpCode;
    }

    public async Task<bool> VerifyOtpAsync(string email, string otpCode, string type)
    {
        // Chỉ lấy OTP của đúng email + type (index Email+Type) thay vì quét toàn bộ.
        var normalized = (email ?? string.Empty).Trim().ToLowerInvariant();
        var candidates = await _otpRepository.FindAsync(x => x.Email == normalized && x.Type == type);
        var latest = candidates
            .OrderByDescending(x => x.ExpiryTime)
            .FirstOrDefault();

        if (latest != null && latest.OtpCode == otpCode && latest.ExpiryTime > DateTime.UtcNow)
        {
            await _otpRepository.DeleteAsync(latest.Id);
            return true;
        }
        return false;
    }
}