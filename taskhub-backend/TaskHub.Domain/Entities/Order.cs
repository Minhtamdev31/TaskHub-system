using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace TaskHub.Domain.Entities;

public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string UserId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanTitle { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentCode { get; set; } = string.Empty; // numeric for PayOS
    public string Status { get; set; } = "Pending"; // "Pending", "Completed", "Cancelled", "Failed"
    public string PaymentGateway { get; set; } = string.Empty; // "PayOS", "MoMo"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}