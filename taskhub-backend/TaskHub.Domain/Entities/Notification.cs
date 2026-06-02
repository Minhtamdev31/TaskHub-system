using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("isRead")]
    public bool IsRead { get; set; } = false;

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty; // "Project", "Task", "Deadline"

    [BsonElement("referenceId")]
    public string ReferenceId { get; set; } = string.Empty; // ProjectId or TaskId

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}