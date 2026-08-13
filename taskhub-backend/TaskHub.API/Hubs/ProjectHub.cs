using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TaskHub.API.Hubs;

// Hub real-time cho từng dự án. Client gọi JoinProject để vào "phòng" của dự án,
// sau đó nhận các sự kiện "projectChanged" khi có comment/task thay đổi.
[Authorize]
public class ProjectHub : Hub
{
    public static string Group(string projectId) => $"project:{projectId}";

    // Nhóm nhận sự kiện đơn hàng real-time — chỉ Admin mới được vào.
    public const string AdminGroup = "admins";

    public Task JoinProject(string projectId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, Group(projectId));

    public Task LeaveProject(string projectId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(projectId));

    // Client admin gọi khi mở trang quản trị. Xác minh role ngay tại server để
    // không ai ngoài Admin nhận được dữ liệu đơn hàng, kể cả khi tự ý gọi.
    public Task JoinAdmin()
    {
        if (Context.User?.IsInRole("Admin") == true)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, AdminGroup);
        }
        return Task.CompletedTask;
    }
}
