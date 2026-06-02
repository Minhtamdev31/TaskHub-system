using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

public class ProjectInvitation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonRepresentation(BsonType.ObjectId)]
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string InviterId { get; set; } = string.Empty;
    public string InviterName { get; set; } = string.Empty;
    public string InvitedEmail { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}