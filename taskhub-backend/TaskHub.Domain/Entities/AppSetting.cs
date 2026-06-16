using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

/// <summary>Cấu hình hệ thống dạng key/value (vd: KeepAlive = "true"/"false").</summary>
[BsonIgnoreExtraElements]
public class AppSetting
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;
}
