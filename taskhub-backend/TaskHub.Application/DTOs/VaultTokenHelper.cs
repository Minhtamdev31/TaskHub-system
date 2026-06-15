using System;
using System.Security.Cryptography;
using System.Text;

namespace TaskHub.Application.Helpers;

// Token mở khóa Kho mật khẩu, ngắn hạn (lớp xác thực thứ 2 sau khi nhập đúng PIN).
// Dạng: base64url("{userId}:{expiryUnix}") + "." + HMAC-SHA256 chữ ký.
// Không lưu ở server (stateless): chỉ cần khóa bí mật để ký và kiểm tra lại.
public static class VaultTokenHelper
{
    public const int LifetimeMinutes = 15;

    public static string Create(string userId, string secretKey)
    {
        var expiry = DateTimeOffset.UtcNow.AddMinutes(LifetimeMinutes).ToUnixTimeSeconds();
        var payload = $"{userId}:{expiry}";
        var encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payload));
        var signature = Sign(encodedPayload, secretKey);
        return $"{encodedPayload}.{signature}";
    }

    // Trả về true nếu token hợp lệ, đúng userId và chưa hết hạn.
    public static bool Validate(string? token, string userId, string secretKey)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        var parts = token.Split('.');
        if (parts.Length != 2) return false;

        var encodedPayload = parts[0];
        var signature = parts[1];

        // Chống giả mạo: chữ ký phải khớp (so sánh chống timing attack).
        var expectedSignature = Sign(encodedPayload, secretKey);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature), Encoding.UTF8.GetBytes(expectedSignature)))
        {
            return false;
        }

        string payload;
        try { payload = Encoding.UTF8.GetString(Base64UrlDecode(encodedPayload)); }
        catch { return false; }

        var fields = payload.Split(':');
        if (fields.Length != 2) return false;
        if (fields[0] != userId) return false;
        if (!long.TryParse(fields[1], out var expiry)) return false;

        return DateTimeOffset.UtcNow.ToUnixTimeSeconds() <= expiry;
    }

    private static string Sign(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var s = input.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}
