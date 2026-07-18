using TaskHub.Application.DTOs;

namespace TaskHub.Application.Interfaces;

public interface IBudgetService
{
    /// <summary>Ngân sách + danh sách yêu cầu mà người gọi được phép xem.</summary>
    Task<(ProjectBudgetResponse? Data, BudgetOperationResult? Error)> GetBudgetAsync(string projectId, string userId);

    /// <summary>Owner/Leader đặt ngân sách dự kiến (mốc ban đầu).</summary>
    Task<BudgetOperationResult> SetBudgetAsync(string projectId, string userId, decimal budget);

    /// <summary>Owner/Leader bơm thêm tiền ngoài mốc dự kiến khi ngân sách không đủ.</summary>
    Task<BudgetOperationResult> AddBudgetAsync(string projectId, string userId, decimal amount);

    /// <summary>Thành viên gửi yêu cầu chi tiền từ task được giao cho mình.</summary>
    Task<BudgetOperationResult> CreateRequestAsync(string projectId, string userId, CreateBudgetRequestDto dto);

    /// <summary>Owner/Leader duyệt yêu cầu (trừ vào ngân sách còn lại).</summary>
    Task<BudgetOperationResult> ApproveAsync(string projectId, string requestId, string userId);

    /// <summary>Owner/Leader từ chối yêu cầu, bắt buộc kèm lý do.</summary>
    Task<BudgetOperationResult> RejectAsync(string projectId, string requestId, string userId, string reason);
}
