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

    [BsonElement("taskId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TaskId { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
