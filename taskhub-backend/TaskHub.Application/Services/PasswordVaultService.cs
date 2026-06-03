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
    private readonly string _encryptionKey;

    public PasswordVaultService(IMongoRepository<PasswordVaultItem> vaultRepository, IConfiguration configuration)
    {
        _vaultRepository = vaultRepository;
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
}