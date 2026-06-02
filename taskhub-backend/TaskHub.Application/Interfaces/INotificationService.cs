namespace TaskHub.Application.Interfaces;

public interface INotificationService
{
    Task CreateAndSendNotificationAsync(string userId, string message, string type, string referenceId, bool sendEmail = true);
    Task<List<Domain.Entities.Notification>> GetNotificationsByUserIdAsync(string userId);
    Task<bool> MarkAsReadAsync(string notificationId);
}