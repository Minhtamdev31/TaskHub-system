using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

/// <summary>Owner/Leader đặt ngân sách DỰ KIẾN (mốc ban đầu) cho dự án.</summary>
public sealed class SetBudgetDto
{
    public decimal Budget { get; set; }
}

/// <summary>Owner/Leader bơm THÊM tiền ngoài mốc dự kiến khi ngân sách không đủ.</summary>
public sealed class AddBudgetDto
{
    public decimal Amount { get; set; }
}

/// <summary>Thành viên gửi yêu cầu chi tiền từ một task được giao.</summary>
public sealed class CreateBudgetRequestDto
{
    public string TaskId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    /// <summary>Low | Medium | High | Critical.</summary>
    public string Importance { get; set; } = BudgetImportance.Medium;
}

/// <summary>Từ chối yêu cầu, bắt buộc kèm lý do.</summary>
public sealed class RejectBudgetRequestDto
{
    public string Reason { get; set; } = string.Empty;
}

public sealed class BudgetRequestResponse
{
    public BudgetRequestResponse(BudgetRequest r)
    {
        Id = r.Id;
        ProjectId = r.ProjectId;
        TaskId = r.TaskId;
        RequesterId = r.RequesterId;
        Amount = r.Amount;
        Reason = r.Reason;
        Purpose = r.Purpose;
        Importance = r.Importance;
        Status = r.Status;
        RejectionReason = r.RejectionReason;
        DecidedByUserId = r.DecidedByUserId;
        DecidedAt = r.DecidedAt;
        CreatedAt = r.CreatedAt;
    }

    public string Id { get; }
    public string ProjectId { get; }
    public string TaskId { get; }
    public string RequesterId { get; }
    public decimal Amount { get; }
    public string Reason { get; }
    public string Purpose { get; }
    public string Importance { get; }
    public string Status { get; }
    public string? RejectionReason { get; }
    public string? DecidedByUserId { get; }
    public DateTime? DecidedAt { get; }
    public DateTime CreatedAt { get; }
}

/// <summary>Toàn cảnh ngân sách của dự án cho màn hình bảng dự án.</summary>
public sealed class ProjectBudgetResponse
{
    /// <summary>Ngân sách dự kiến (mốc ban đầu).</summary>
    public decimal Planned { get; set; }
    /// <summary>Tiền đã thêm ngoài dự kiến (vượt mốc).</summary>
    public decimal Added { get; set; }
    /// <summary>Tổng ngân sách khả dụng = Planned + Added.</summary>
    public decimal Budget { get; set; }
    /// <summary>Tổng các yêu cầu đã duyệt.</summary>
    public decimal Spent { get; set; }
    public decimal Remaining { get; set; }
    /// <summary>True nếu người gọi là Owner/Leader (đặt ngân sách + duyệt).</summary>
    public bool CanManage { get; set; }
    public List<BudgetRequestResponse> Requests { get; set; } = new();
}

/// <summary>Kết quả thao tác, để service báo lỗi mà không ném exception.</summary>
public sealed class BudgetOperationResult
{
    public bool Success { get; init; }
    public string? Error { get; init; }
    /// <summary>True khi lỗi do chủ dự án chưa có Premium.</summary>
    public bool RequiresUpgrade { get; init; }
    /// <summary>True khi người gọi không đủ quyền.</summary>
    public bool Forbidden { get; init; }
    public bool NotFound { get; init; }
    public BudgetRequestResponse? Request { get; init; }

    public static BudgetOperationResult Ok(BudgetRequest? r = null) =>
        new() { Success = true, Request = r is null ? null : new BudgetRequestResponse(r) };

    public static BudgetOperationResult Fail(string error) =>
        new() { Success = false, Error = error };

    public static BudgetOperationResult Upgrade() =>
        new()
        {
            Success = false,
            RequiresUpgrade = true,
            Error = "Quản lý chi tiêu là tính năng Premium. Chủ dự án cần nâng cấp để sử dụng."
        };

    public static BudgetOperationResult Deny(string error) =>
        new() { Success = false, Forbidden = true, Error = error };

    public static BudgetOperationResult Missing(string error) =>
        new() { Success = false, NotFound = true, Error = error };
}
