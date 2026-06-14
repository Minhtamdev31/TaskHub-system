using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public class Comment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    // Optional single attachment stored inline as a base64 data string.
    // Suitable for small files/images; kept null when there's no attachment.
    [BsonElement("attachmentName")]
    [BsonIgnoreIfNull]
    public string? AttachmentName { get; set; }

    [BsonElement("attachmentType")]
    [BsonIgnoreIfNull]
    public string? AttachmentType { get; set; }

    [BsonElement("attachmentData")]
    [BsonIgnoreIfNull]
    public string? AttachmentData { get; set; }

    [BsonElement("taskId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TaskId { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
