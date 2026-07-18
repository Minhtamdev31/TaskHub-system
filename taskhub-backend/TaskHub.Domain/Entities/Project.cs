using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public sealed class ProjectMember
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("projectRole")]
    public string ProjectRole { get; set; } = "Member";
}

[BsonIgnoreExtraElements]
public class Project
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "Planning";

    [BsonElement("startDate")]
    public DateTime? StartDate { get; set; }

    [BsonElement("endDate")]
    public DateTime? EndDate { get; set; }

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("members")]
    public List<ProjectMember> Members { get; set; } = new();

    /// <summary>
    /// Ngân sách DỰ KIẾN (mốc ban đầu) của dự án (VND). Chỉ Owner/Leader đặt được.
    /// Số đã chi được tính từ các BudgetRequest đã duyệt, không lưu sẵn ở đây
    /// để tránh lệch số liệu.
    /// </summary>
    [BsonElement("budget")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Budget { get; set; }

    /// <summary>
    /// Tiền ĐÃ THÊM ngoài mốc dự kiến (VND). Cộng dồn mỗi lần Owner/Leader bơm thêm
    /// khi ngân sách dự kiến không đủ. Tổng ngân sách khả dụng = Budget + AddedBudget.
    /// Giúp biết dự án đã vượt mốc dự kiến bao nhiêu.
    /// </summary>
    [BsonElement("addedBudget")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal AddedBudget { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime? UpdatedAt { get; set; }
}
