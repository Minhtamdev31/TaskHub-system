using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using TaskHub.Application.Interfaces;

namespace TaskHub.Application.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");

        // Sửa lại cho đúng Key trong file appsettings.json của Tâm
        var fromEmail = emailSettings["SenderEmail"] ?? "your-email@gmail.com";
        var rawAppPassword = emailSettings["SenderPassword"] ?? "your-app-password";

        // Tự động loại bỏ khoảng trắng dư thừa trong mã OTP/Mật khẩu ứng dụng
        var appPassword = rawAppPassword.Replace(" ", "");

        using var client = new SmtpClient("smtp.gmail.com", 587)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(fromEmail, appPassword)
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(fromEmail, "TaskHub Support"),
            Subject = subject,
            Body = htmlMessage,
            IsBodyHtml = true
        };

        mailMessage.To.Add(toEmail);

        await client.SendMailAsync(mailMessage);
    }
}