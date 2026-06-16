namespace TaskHub.Application.Services;

/// <summary>
/// Cờ in-memory điều khiển việc "giữ thức" (chống ngủ đông trên Render).
/// Admin bật/tắt qua API; worker tự ping đọc cờ này.
/// </summary>
public class KeepAliveState
{
    private volatile bool _enabled = true;

    public bool Enabled
    {
        get => _enabled;
        set => _enabled = value;
    }
}
