using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskHub.Domain.Entities;

[BsonIgnoreExtraElements]
public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = "Member";

    // Mã PIN riêng (BCrypt hash) để mở khóa Kho mật khẩu — lớp xác thực thứ 2.
    // Rỗng = người dùng chưa thiết lập PIN.
    [BsonElement("vaultPinHash")]
    public string VaultPinHash { get; set; } = string.Empty;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("isEmailVerified")]
    public bool IsEmailVerified { get; set; } = false;

    [BsonElement("profile")]
    public UserProfile Profile { get; set; } = new();

    [BsonElement("subscription")]
    public SubscriptionInfo Subscription { get; set; } = SubscriptionInfo.FreeActive;

    [BsonElement("settings")]
    public UserSettings Settings { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    [BsonIgnoreExtraElements]
    public sealed class UserProfile
    {
        [BsonElement("fullName")]
        public string FullName { get; set; } = string.Empty;

        [BsonElement("avatarUrl")]
        public string AvatarUrl { get; set; } = string.Empty;

        [BsonElement("bio")]
        public string Bio { get; set; } = string.Empty;

        [BsonElement("phoneNumber")]
        public string PhoneNumber { get; set; } = string.Empty;

        [BsonElement("jobTitle")]
        public string JobTitle { get; set; } = string.Empty;
    }

    [BsonIgnoreExtraElements]
    public sealed class UserSettings
    {
        [BsonElement("theme")]
        public string Theme { get; set; } = "Light";

        [BsonElement("language")]
        public string Language { get; set; } = "en";

        [BsonElement("enableNotifications")]
        public bool EnableNotifications { get; set; } = true;
    }
}
