namespace TaskHub.Application.DTOs;

/// <summary>
/// Số liệu tổng quan cho Dashboard, kèm so sánh với tuần trước.
/// Trạng thái tuần trước được tái dựng từ <c>StatusHistory</c> của task nên chính xác.
/// </summary>
public sealed class DashboardStatsDto
{
    // Ảnh chụp hiện tại
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int Productivity { get; set; } // % hoàn thành (Done / Total)

    // So sánh với cùng thời điểm tuần trước (đơn vị: % thay đổi tương đối)
    public int TotalChangePct { get; set; }
    public int CompletedChangePct { get; set; }
    public int InProgressChangePct { get; set; }
    public int ProductivityChangePoints { get; set; } // chênh lệch điểm phần trăm

    // Công việc hoàn thành theo từng ngày trong tuần (T2..CN)
    public int[] WeeklyCompleted { get; set; } = new int[7];
}
