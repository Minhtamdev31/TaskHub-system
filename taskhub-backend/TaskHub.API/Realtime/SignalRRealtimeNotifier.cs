using Microsoft.AspNetCore.SignalR;
using TaskHub.API.Hubs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Realtime;

public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<ProjectHub> _hub;

    public SignalRRealtimeNotifier(IHubContext<ProjectHub> hub)
    {
        _hub = hub;
    }

    public Task ProjectChangedAsync(string projectId, string action, object? payload = null)
    {
        if (string.IsNullOrWhiteSpace(projectId))
        {
            return Task.CompletedTask;
        }

        return _hub.Clients
            .Group(ProjectHub.Group(projectId))
            .SendAsync("projectChanged", new { projectId, action, payload });
    }

    public Task OrderChangedAsync(string action, object payload) =>
        _hub.Clients
            .Group(ProjectHub.AdminGroup)
            .SendAsync("orderChanged", new { action, order = payload });
}
