using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace TaskHub.Application.Helpers;

public static class EncryptionHelper
{
    /// <summary>
    /// Mã hóa chuỗi văn bản bằng AES-256. Một IV ngẫu nhiên được tạo và gắn vào đầu bản mã.
    /// </summary>
    public static string Encrypt(string plainText, string key)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;

        byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        
        using Aes aes = Aes.Create();
        aes.Key = keyBytes;
        aes.GenerateIV();
        byte[] iv = aes.IV;

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using MemoryStream ms = new();
        
        // Lưu IV vào trước để có thể đọc ra khi giải mã
        ms.Write(iv, 0, iv.Length);

        using (CryptoStream cs = new(ms, encryptor, CryptoStreamMode.Write))
        using (StreamWriter sw = new(cs))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    /// <summary>
    /// Giải mã AES-256. Yêu cầu IV nằm ở 16 byte đầu tiên của dữ liệu đã Base64 decode.
    /// </summary>
    public static string Decrypt(string cipherText, string key)
    {
        if (string.IsNullOrEmpty(cipherText)) return string.Empty;

        byte[] fullCipher = Convert.FromBase64String(cipherText);
        byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));

        using Aes aes = Aes.Create();
        aes.Key = keyBytes;

        byte[] iv = new byte[16];
        byte[] cipher = new byte[fullCipher.Length - iv.Length];

        // Tách IV và dữ liệu mã hóa
        Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
        Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);
        
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using MemoryStream ms = new(cipher);
        using CryptoStream cs = new(ms, decryptor, CryptoStreamMode.Read);
        using StreamReader sr = new(cs);
        
        return sr.ReadToEnd();
    }
}