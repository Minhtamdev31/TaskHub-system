namespace TaskHub.Application.Interfaces;

public interface IAiService
{
    /// <summary>
    /// Tạo bản tóm tắt tình hình dự án bằng tiếng Việt từ các task và bình luận.
    /// Trả về null nếu dự án không tồn tại hoặc người dùng không có quyền.
    /// </summary>
    Task<string?> SummarizeProjectAsync(string projectId, string userId);
}
