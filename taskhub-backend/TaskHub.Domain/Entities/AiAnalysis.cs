using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

/// <summary>
/// Kết quả phân tích/tóm tắt AI đã lưu để tái dùng (tiết kiệm token Groq).
/// CacheKey định danh đối tượng (vd "task:{id}", "mywork:{userId}").
/// SourceHash = hash của dữ liệu nguồn — nếu dữ liệu đổi, hash đổi → tự sinh lại (lazy invalidation).
/// </summary>
[BsonIgnoreExtraElements]
public class AiAnalysis
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("cacheKey")]
    public string CacheKey { get; set; } = string.Empty;

    [BsonElement("sourceHash")]
    public string SourceHash { get; set; } = string.Empty;

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [BsonElement("generatedByUserId")]
    public string GeneratedByUserId { get; set; } = string.Empty;

    [BsonElement("generatedAt")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
