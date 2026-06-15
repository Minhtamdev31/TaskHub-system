using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;
using TaskHub.Application.Helpers;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class PasswordVaultService : IPasswordVaultService
{
    private readonly IMongoRepository<PasswordVaultItem> _vaultRepository;
    private readonly IMongoRepository<User> _userRepository;
    private readonly string _encryptionKey;

    public PasswordVaultService(
        IMongoRepository<PasswordVaultItem> vaultRepository,
        IMongoRepository<User> userRepository,
        IConfiguration configuration)
    {
        _vaultRepository = vaultRepository;
        _userRepository = userRepository;
        // Khuyến nghị lưu key này trong Environment Variables hoặc Azure Key Vault
        _encryptionKey = configuration["Security:VaultEncryptionKey"]
                         ?? throw new InvalidOperationException("Vault encryption key is not configured.");
    }

    public async Task<bool> AddCredentialAsync(string userId, AddCredentialDto dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return false;
        }

        var encryptedPassword = EncryptionHelper.Encrypt(dto.Password, _encryptionKey);

        var item = new PasswordVaultItem
        {
            UserId = userId,
            Title = dto.Title.Trim(),
            Url = dto.Url?.Trim() ?? string.Empty,
            Username = dto.Username?.Trim() ?? string.Empty,
            EncryptedPassword = encryptedPassword,
            Note = dto.Note?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        await _vaultRepository.CreateAsync(item);
        return true;
    }

    public async Task<List<CredentialResponseDto>> GetMyCredentialsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new List<CredentialResponseDto>();

        var allItems = await _vaultRepository.GetAllAsync();
        var userItems = allItems.Where(i => i.UserId == userId).ToList();

        var response = new List<CredentialResponseDto>();
        foreach (var item in userItems)
        {
            try
            {
                var decryptedPassword = EncryptionHelper.Decrypt(item.EncryptedPassword, _encryptionKey);
                response.Add(new CredentialResponseDto(item, decryptedPassword));
            }
            catch
            {
                // Fallback nếu giải mã lỗi (ví dụ key bị đổi)
                response.Add(new CredentialResponseDto(item, "******** [Lỗi Giải Mã]"));
            }
        }

        return response;
    }

    public async Task<bool> DeleteCredentialAsync(string id, string userId)
    {
        var item = await _vaultRepository.GetByIdAsync(id);
        if (item is null || item.UserId != userId) return false;

        await _vaultRepository.DeleteAsync(id);
        return true;
    }

    // --- Xác thực 2 lớp (PIN) ---

    public async Task<bool> HasPinAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        return !string.IsNullOrEmpty(user?.VaultPinHash);
    }

    public async Task<bool> SetPinAsync(string userId, string pin)
    {
        if (!IsValidPin(pin)) return false;

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null) return false;
        // Chỉ thiết lập khi chưa có PIN — đổi PIN phải dùng ChangePinAsync.
        if (!string.IsNullOrEmpty(user.VaultPinHash)) return false;

        user.VaultPinHash = BCrypt.Net.BCrypt.HashPassword(pin);
        await _userRepository.UpdateAsync(user.Id, user);
        return true;
    }

    public async Task<bool> VerifyPinAsync(string userId, string pin)
    {
        if (string.IsNullOrWhiteSpace(pin)) return false;

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || string.IsNullOrEmpty(user.VaultPinHash)) return false;

        return BCrypt.Net.BCrypt.Verify(pin, user.VaultPinHash);
    }

    public async Task<bool> ChangePinAsync(string userId, string oldPin, string newPin)
    {
        if (!IsValidPin(newPin)) return false;

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null || string.IsNullOrEmpty(user.VaultPinHash)) return false;
        if (!BCrypt.Net.BCrypt.Verify(oldPin, user.VaultPinHash)) return false;

        user.VaultPinHash = BCrypt.Net.BCrypt.HashPassword(newPin);
        await _userRepository.UpdateAsync(user.Id, user);
        return true;
    }

    // PIN gồm 4–12 ký tự số.
    private static bool IsValidPin(string pin) =>
        !string.IsNullOrWhiteSpace(pin) && pin.Length is >= 4 and <= 12 && pin.All(char.IsDigit);
}