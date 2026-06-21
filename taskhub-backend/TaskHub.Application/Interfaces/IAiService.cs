namespace TaskHub.Application.Interfaces;

public interface IAiService
{
    /// <summary>
    /// Tạo bản tóm tắt tình hình dự án bằng tiếng Việt từ các task và bình luận.
    /// Trả về null nếu dự án không tồn tại hoặc người dùng không có quyền.
    /// </summary>
    Task<string?> SummarizeProjectAsync(string projectId, string userId);

    /// <summary>
    /// Phân tích 1 task (nội dung, độ ưu tiên, hạn) → tóm tắt + việc cần làm.
    /// Có cache DB theo hash nội dung: task không đổi thì trả lại bản đã lưu (không tốn token).
    /// Trả null nếu task không tồn tại hoặc người dùng không có quyền.
    /// </summary>
    Task<string?> AnalyzeTaskAsync(string taskId, string userId);

    /// <summary>
    /// Tóm tắt công việc của người dùng qua các dự án (cho Dashboard). Có cache DB theo snapshot task.
    /// </summary>
    Task<string?> SummarizeMyWorkAsync(string userId);
}
