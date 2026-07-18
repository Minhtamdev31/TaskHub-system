using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

/// <summary>
/// Quản lý chi tiêu dự án.
///
/// Luật nghiệp vụ:
/// - Là tính năng Premium, xét theo CHỦ dự án (Owner). Owner có Premium thì cả
///   nhóm dùng được, thành viên không cần tự mua.
/// - Đặt ngân sách / duyệt / từ chối: Owner hoặc thành viên có ProjectRole="Leader"
///   (khớp với quy ước phân quyền sẵn có của ProjectService).
/// - Thành viên thường chỉ xem được ngân sách và gửi yêu cầu từ task được giao
///   cho chính mình; không tác động trực tiếp vào số tiền.
/// - Số đã chi (Spent) = tổng các yêu cầu đã duyệt, tính lại mỗi lần đọc nên
///   không bao giờ lệch với lịch sử yêu cầu.
/// - Yêu cầu vượt ngân sách còn lại vẫn duyệt được (ngân sách có thể âm): frontend
///   cảnh báo đỏ để người duyệt cân nhắc nâng ngân sách.
/// </summary>
public class BudgetService : IBudgetService
{
    private readonly IMongoRepository<BudgetRequest> _requests;
    private readonly IMongoRepository<Project> _projects;
    private readonly IMongoRepository<TaskItem> _tasks;
    private readonly IUserService _userService;
    private readonly INotificationService _notifications;

    public BudgetService(
        IMongoRepository<BudgetRequest> requests,
        IMongoRepository<Project> projects,
        IMongoRepository<TaskItem> tasks,
        IUserService userService,
        INotificationService notifications)
    {
        _requests = requests;
        _projects = projects;
        _tasks = tasks;
        _userService = userService;
        _notifications = notifications;
    }

    private static bool IsOwner(Project p, string userId) =>
        p.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);

    private static bool IsLeader(Project p, string userId) =>
        p.Members.FirstOrDefault(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            ?.ProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false;

    private static bool CanManage(Project p, string userId) => IsOwner(p, userId) || IsLeader(p, userId);

    private static bool IsParticipant(Project p, string userId) =>
        IsOwner(p, userId) || p.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));

    /// <summary>Premium xét theo chủ dự án, không theo người đang gọi.</summary>
    private async Task<bool> OwnerHasPremiumAsync(Project p)
    {
        var owner = await _userService.GetByIdAsync(p.OwnerId);
        return owner?.Subscription?.IsActivePremium ?? false;
    }

    /// <summary>Kiểm tra chung: dự án tồn tại, người gọi thuộc dự án, chủ dự án có Premium.</summary>
    private async Task<(Project? Project, BudgetOperationResult? Error)> LoadAsync(string projectId, string userId)
    {
        var project = await _projects.GetByIdAsync(projectId);
        if (project is null)
            return (null, BudgetOperationResult.Missing("Không tìm thấy dự án."));

        if (!IsParticipant(project, userId))
            return (null, BudgetOperationResult.Deny("Bạn không thuộc dự án này."));

        if (!await OwnerHasPremiumAsync(project))
            return (null, BudgetOperationResult.Upgrade());

        return (project, null);
    }

    private async Task<decimal> SpentAsync(string projectId)
    {
        var approved = await _requests.FindAsync(r =>
            r.ProjectId == projectId && r.Status == BudgetRequestStatus.Approved);
        return approved.Sum(r => r.Amount);
    }

    public async Task<(ProjectBudgetResponse? Data, BudgetOperationResult? Error)> GetBudgetAsync(string projectId, string userId)
    {
        var (project, error) = await LoadAsync(projectId, userId);
        if (project is null) return (null, error);

        var all = await _requests.FindAsync(r => r.ProjectId == projectId);
        var manage = CanManage(project, userId);

        // Người quản lý xem mọi yêu cầu; thành viên thường chỉ xem yêu cầu của chính mình.
        var visible = manage
            ? all
            : all.Where(r => r.RequesterId.Equals(userId, StringComparison.OrdinalIgnoreCase)).ToList();

        var spent = all.Where(r => r.Status == BudgetRequestStatus.Approved).Sum(r => r.Amount);
        var total = project.Budget + project.AddedBudget;

        return (new ProjectBudgetResponse
        {
            Planned = project.Budget,
            Added = project.AddedBudget,
            Budget = total,
            Spent = spent,
            Remaining = total - spent,
            CanManage = manage,
            Requests = visible
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new BudgetRequestResponse(r))
                .ToList()
        }, null);
    }

    public async Task<BudgetOperationResult> SetBudgetAsync(string projectId, string userId, decimal budget)
    {
        if (budget < 0) return BudgetOperationResult.Fail("Ngân sách không được âm.");

        var (project, error) = await LoadAsync(projectId, userId);
        if (project is null) return error!;

        if (!CanManage(project, userId))
            return BudgetOperationResult.Deny("Chỉ chủ dự án hoặc trưởng nhóm mới được đặt ngân sách.");

        project.Budget = budget;
        project.UpdatedAt = DateTime.UtcNow;
        await _projects.UpdateAsync(project.Id, project);

        return BudgetOperationResult.Ok();
    }

    public async Task<BudgetOperationResult> AddBudgetAsync(string projectId, string userId, decimal amount)
    {
        if (amount <= 0) return BudgetOperationResult.Fail("Số tiền thêm phải lớn hơn 0.");

        var (project, error) = await LoadAsync(projectId, userId);
        if (project is null) return error!;

        if (!CanManage(project, userId))
            return BudgetOperationResult.Deny("Chỉ chủ dự án hoặc trưởng nhóm mới được thêm tiền.");

        project.AddedBudget += amount;
        project.UpdatedAt = DateTime.UtcNow;
        await _projects.UpdateAsync(project.Id, project);

        return BudgetOperationResult.Ok();
    }

    public async Task<BudgetOperationResult> CreateRequestAsync(string projectId, string userId, CreateBudgetRequestDto dto)
    {
        if (dto is null) return BudgetOperationResult.Fail("Dữ liệu không hợp lệ.");
        if (dto.Amount <= 0) return BudgetOperationResult.Fail("Số tiền phải lớn hơn 0.");
        if (string.IsNullOrWhiteSpace(dto.Reason)) return BudgetOperationResult.Fail("Vui lòng nhập lý do.");
        if (string.IsNullOrWhiteSpace(dto.Purpose)) return BudgetOperationResult.Fail("Vui lòng nhập mục đích sử dụng.");
        if (string.IsNullOrWhiteSpace(dto.TaskId)) return BudgetOperationResult.Fail("Thiếu task.");

        var importance = string.IsNullOrWhiteSpace(dto.Importance) ? BudgetImportance.Medium : dto.Importance.Trim();
        if (!BudgetImportance.IsValid(importance))
            return BudgetOperationResult.Fail("Mức độ quan trọng không hợp lệ.");

        var (project, error) = await LoadAsync(projectId, userId);
        if (project is null) return error!;

        var task = await _tasks.GetByIdAsync(dto.TaskId);
        if (task is null) return BudgetOperationResult.Missing("Không tìm thấy công việc.");
        if (!task.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase))
            return BudgetOperationResult.Fail("Công việc không thuộc dự án này.");

        // Chỉ người được giao task mới được xin tiền cho task đó.
        if (!task.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            return BudgetOperationResult.Deny("Bạn chỉ có thể yêu cầu chi tiền cho công việc được giao cho mình.");

        var request = new BudgetRequest
        {
            ProjectId = projectId,
            TaskId = dto.TaskId,
            RequesterId = userId,
            Amount = dto.Amount,
            Reason = dto.Reason.Trim(),
            Purpose = dto.Purpose.Trim(),
            Importance = importance,
            Status = BudgetRequestStatus.Pending
        };
        await _requests.CreateAsync(request);

        // Báo cho chủ dự án và các trưởng nhóm để họ vào duyệt.
        var approvers = new List<string> { project.OwnerId };
        approvers.AddRange(project.Members
            .Where(m => m.ProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false)
            .Select(m => m.UserId));

        var requester = await _userService.GetByIdAsync(userId);
        var who = requester?.Profile?.FullName ?? requester?.Username ?? "Một thành viên";

        foreach (var approverId in approvers.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (approverId.Equals(userId, StringComparison.OrdinalIgnoreCase)) continue;
            await _notifications.CreateAndSendNotificationAsync(
                approverId,
                $"{who} yêu cầu chi {request.Amount:N0}₫ cho công việc \"{task.Title}\".",
                "BudgetRequest",
                request.Id,
                sendEmail: false,
                link: $"/projects/{projectId}");
        }

        return BudgetOperationResult.Ok(request);
    }

    public async Task<BudgetOperationResult> ApproveAsync(string projectId, string requestId, string userId)
    {
        var (project, request, error) = await LoadForDecisionAsync(projectId, requestId, userId);
        if (project is null || request is null) return error!;

        request.Status = BudgetRequestStatus.Approved;
        request.DecidedByUserId = userId;
        request.DecidedAt = DateTime.UtcNow;
        request.RejectionReason = null;
        await _requests.UpdateAsync(request.Id, request);

        var remaining = project.Budget + project.AddedBudget - await SpentAsync(projectId);
        await NotifyDecisionAsync(request, approved: true, reason: null, remaining: remaining);

        return BudgetOperationResult.Ok(request);
    }

    public async Task<BudgetOperationResult> RejectAsync(string projectId, string requestId, string userId, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            return BudgetOperationResult.Fail("Vui lòng nhập lý do không duyệt.");

        var (project, request, error) = await LoadForDecisionAsync(projectId, requestId, userId);
        if (project is null || request is null) return error!;

        request.Status = BudgetRequestStatus.Rejected;
        request.RejectionReason = reason.Trim();
        request.DecidedByUserId = userId;
        request.DecidedAt = DateTime.UtcNow;
        await _requests.UpdateAsync(request.Id, request);

        await NotifyDecisionAsync(request, approved: false, reason: request.RejectionReason, remaining: null);

        return BudgetOperationResult.Ok(request);
    }

    /// <summary>Ràng buộc chung cho duyệt/từ chối: quyền quản lý + yêu cầu còn Pending.</summary>
    private async Task<(Project? Project, BudgetRequest? Request, BudgetOperationResult? Error)> LoadForDecisionAsync(
        string projectId, string requestId, string userId)
    {
        var (project, error) = await LoadAsync(projectId, userId);
        if (project is null) return (null, null, error);

        if (!CanManage(project, userId))
            return (null, null, BudgetOperationResult.Deny("Chỉ chủ dự án hoặc trưởng nhóm mới được duyệt yêu cầu."));

        var request = await _requests.GetByIdAsync(requestId);
        if (request is null || !request.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase))
            return (null, null, BudgetOperationResult.Missing("Không tìm thấy yêu cầu."));

        if (request.Status != BudgetRequestStatus.Pending)
            return (null, null, BudgetOperationResult.Fail("Yêu cầu này đã được xử lý."));

        return (project, request, null);
    }

    private async Task NotifyDecisionAsync(BudgetRequest request, bool approved, string? reason, decimal? remaining)
    {
        var message = approved
            ? $"Yêu cầu chi {request.Amount:N0}₫ của bạn đã được duyệt. Ngân sách còn lại: {remaining:N0}₫."
            : $"Yêu cầu chi {request.Amount:N0}₫ của bạn không được duyệt. Lý do: {reason}";

        await _notifications.CreateAndSendNotificationAsync(
            request.RequesterId,
            message,
            "BudgetRequest",
            request.Id,
            sendEmail: false,
            link: $"/projects/{request.ProjectId}");
    }
}
