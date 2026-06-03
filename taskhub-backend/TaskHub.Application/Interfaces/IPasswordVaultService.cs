using System.Collections.Generic;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;

namespace TaskHub.Application.Interfaces;

public interface IPasswordVaultService
{
    Task<bool> AddCredentialAsync(string userId, AddCredentialDto dto);
    Task<List<CredentialResponseDto>> GetMyCredentialsAsync(string userId);
    Task<bool> DeleteCredentialAsync(string id, string userId);
}