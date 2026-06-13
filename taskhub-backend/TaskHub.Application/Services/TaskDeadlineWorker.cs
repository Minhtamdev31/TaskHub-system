using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class TaskDeadlineWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public TaskDeadlineWorker(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new PeriodicTimer(TimeSpan.FromHours(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CheckDeadlinesAsync();
        }
    }

    private async Task CheckDeadlinesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var taskRepository = scope.ServiceProvider.GetRequiredService<IMongoRepository<TaskItem>>();
        var notificationRepository = scope.ServiceProvider.GetRequiredService<IMongoRepository<Notification>>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;
        var next24Hours = now.AddHours(24);

        var allTasks = await taskRepository.GetAllAsync();
        var upcomingTasks = allTasks.Where(t => 
            t.Status != "Done" && 
            t.DueDate.HasValue && 
            t.DueDate.Value > now && 
            t.DueDate.Value <= next24Hours && 
            !string.IsNullOrEmpty(t.UserId)).ToList();

        var allNotifications = await notificationRepository.GetAllAsync();

        foreach (var task in upcomingTasks)
        {
            // Anti-spam: check if a deadline notification was already sent for this task today
            bool alreadyNotified = allNotifications.Any(n => 
                n.ReferenceId == task.Id && 
                n.Type == "Deadline" && 
                n.CreatedAt > now.Date);

            if (!alreadyNotified)
            {
                await notificationService.CreateAndSendNotificationAsync(
                    task.UserId,
                    $"[Urgent] Your task \"{task.Title}\" is expiring soon!",
                    "Deadline",
                    task.Id);
            }
        }
    }
}