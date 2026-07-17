using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

/// <summary>
/// Yêu cầu chi tiền từ ngân sách dự án. Thành viên gửi từ một task được giao cho
/// mình; Owner/Leader duyệt hoặc từ chối (kèm lý do).
/// </summary>
[BsonIgnoreExtraElements]
public class BudgetRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("projectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ProjectId { get; set; } = string.Empty;

    [BsonElement("taskId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TaskId { get; set; } = string.Empty;

    [BsonElement("requesterId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string RequesterId { get; set; } = string.Empty;

    [BsonElement("amount")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Amount { get; set; }

    /// <summary>Lý do cần khoản tiền này.</summary>
    [BsonElement("reason")]
    public string Reason { get; set; } = string.Empty;

    /// <summary>Mục đích sử dụng khoản tiền.</summary>
    [BsonElement("purpose")]
    public string Purpose { get; set; } = string.Empty;

    /// <summary>Mức độ quan trọng: Low | Medium | High | Critical.</summary>
    [BsonElement("importance")]
    public string Importance { get; set; } = BudgetImportance.Medium;

    /// <summary>Pending | Approved | Rejected.</summary>
    [BsonElement("status")]
    public string Status { get; set; } = BudgetRequestStatus.Pending;

    /// <summary>Lý do từ chối, chỉ có khi Status = Rejected.</summary>
    [BsonElement("rejectionReason")]
    public string? RejectionReason { get; set; }

    [BsonElement("decidedByUserId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DecidedByUserId { get; set; }

    [BsonElement("decidedAt")]
    public DateTime? DecidedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class BudgetRequestStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";

    public static bool IsValid(string? s) =>
        s == Pending || s == Approved || s == Rejected;
}

public static class BudgetImportance
{
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Critical = "Critical";

    public static bool IsValid(string? s) =>
        s == Low || s == Medium || s == High || s == Critical;
}
