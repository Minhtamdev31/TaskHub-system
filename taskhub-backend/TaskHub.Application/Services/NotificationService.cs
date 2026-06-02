using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class NotificationService : INotificationService
{
    private readonly IMongoRepository<Notification> _notificationRepository;
    private readonly IMongoRepository<User> _userRepository;
    private readonly IEmailService _emailService;

    public NotificationService(
        IMongoRepository<Notification> notificationRepository,
        IMongoRepository<User> userRepository,
        IEmailService emailService)
    {
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task CreateAndSendNotificationAsync(string userId, string message, string type, string referenceId, bool sendEmail = true)
    {
        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            Type = type,
            ReferenceId = referenceId,
            CreatedAt = DateTime.UtcNow
        };

        await _notificationRepository.CreateAsync(notification);

        if (sendEmail)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user != null && !string.IsNullOrEmpty(user.Email))
            {
                string subject = $"TaskHub: {type} Notification";
                await _emailService.SendEmailAsync(user.Email, subject, $"<p>{message}</p>");
            }
        }
    }

    public async Task<List<Notification>> GetNotificationsByUserIdAsync(string userId)
    {
        var all = await _notificationRepository.GetAllAsync();
        return all.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToList();
    }

    public async Task<bool> MarkAsReadAsync(string notificationId)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId);
        if (notification == null) return false;
        notification.IsRead = true;
        await _notificationRepository.UpdateAsync(notificationId, notification);
        return true;
    }
}