namespace TaskHub.Application.Interfaces;

public interface INotificationService
{
    Task CreateAndSendNotificationAsync(string userId, string message, string type, string referenceId, bool sendEmail = true, string? link = null);
    Task<List<Domain.Entities.Notification>> GetNotificationsByUserIdAsync(string userId);
    Task<bool> MarkAsReadAsync(string notificationId);
}