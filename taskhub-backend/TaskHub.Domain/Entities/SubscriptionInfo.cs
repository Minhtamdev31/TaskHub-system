using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public sealed class SubscriptionInfo
{
    [BsonElement("plan")]
    public string Plan { get; set; } = "Free";

    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    [BsonElement("startDate")]
    public DateTime? StartDate { get; set; } = DateTime.UtcNow;

    [BsonElement("endDate")]
    public DateTime? EndDate { get; set; }

    public static SubscriptionInfo FreeActive => new()
    {
        Plan = "Free",
        Status = "Active",
        StartDate = DateTime.UtcNow,
        EndDate = null
    };
}
