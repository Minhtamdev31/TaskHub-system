using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TaskHub.API.Hubs;

// Hub real-time cho từng dự án. Client gọi JoinProject để vào "phòng" của dự án,
// sau đó nhận các sự kiện "projectChanged" khi có comment/task thay đổi.
[Authorize]
public class ProjectHub : Hub
{
    public static string Group(string projectId) => $"project:{projectId}";

    public Task JoinProject(string projectId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, Group(projectId));

    public Task LeaveProject(string projectId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(projectId));
}
