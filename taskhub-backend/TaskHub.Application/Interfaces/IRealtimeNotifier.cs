namespace TaskHub.Application.Interfaces;

// Đẩy sự kiện real-time tới các client đang mở một dự án (qua SignalR).
// Định nghĩa ở tầng Application để service không phụ thuộc trực tiếp vào SignalR.
public interface IRealtimeNotifier
{
    Task ProjectChangedAsync(string projectId, string action, object? payload = null);

    // Đẩy tới riêng nhóm Admin: đơn hàng mới tạo / đổi trạng thái thanh toán (real-time bảng đơn).
    Task OrderChangedAsync(string action, object payload);
}
