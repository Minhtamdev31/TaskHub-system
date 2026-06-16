using System.Collections.Generic;
using System.Threading.Tasks;
using TaskHub.Application.DTOs;

namespace TaskHub.Application.Interfaces;

public interface IPasswordVaultService
{
    Task<bool> AddCredentialAsync(string userId, AddCredentialDto dto);
    Task<List<CredentialResponseDto>> GetMyCredentialsAsync(string userId);
    Task<bool> DeleteCredentialAsync(string id, string userId);

    // --- Xác thực 2 lớp (PIN) cho Kho mật khẩu ---
    Task<bool> HasPinAsync(string userId);
    Task<bool> SetPinAsync(string userId, string pin);          // chỉ thiết lập khi chưa có PIN
    Task<bool> VerifyPinAsync(string userId, string pin);
    Task<bool> ChangePinAsync(string userId, string oldPin, string newPin);
    Task<bool> ResetPinAsync(string userId, string newPin);     // đặt PIN mới sau khi đã xác thực OTP
}