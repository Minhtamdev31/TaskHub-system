using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

public class OtpRecord
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "Register" or "ResetPassword"
    public DateTime ExpiryTime { get; set; }
}