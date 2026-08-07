using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public class TaskItem
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "Todo";

    [BsonElement("priority")]
    public string Priority { get; set; } = "Medium";

    [BsonElement("dueDate")]
    public DateTime? DueDate { get; set; }

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    // Người tạo công việc (giữ nguyên kể cả khi giao lại cho người khác).
    // Lưu dạng chuỗi (không ép ObjectId) để task cũ thiếu trường vẫn an toàn.
    [BsonElement("createdById")]
    public string CreatedById { get; set; } = string.Empty;

    [BsonElement("projectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ProjectId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Nhật ký thay đổi trạng thái, dùng để tái dựng trạng thái task tại bất kỳ
    /// thời điểm nào (phục vụ thống kê tuần này / tuần trước chính xác).
    /// </summary>
    [BsonElement("statusHistory")]
    public List<StatusChange> StatusHistory { get; set; } = new();
}

[BsonIgnoreExtraElements]
public class StatusChange
{
    [BsonElement("status")]
    public string Status { get; set; } = string.Empty;

    [BsonElement("changedAt")]
    public DateTime ChangedAt { get; set; }
}
