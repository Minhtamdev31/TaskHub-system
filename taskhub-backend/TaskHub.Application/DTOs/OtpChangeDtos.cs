namespace TaskHub.Application.DTOs;

/// <summary>Xác nhận đổi mật khẩu bằng OTP gửi qua email (không cần mật khẩu cũ).</summary>
public sealed class ChangePasswordOtpRequest
{
    public string Otp { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Xác nhận đổi mã PIN kho mật khẩu bằng OTP gửi qua email (không cần PIN cũ).</summary>
public sealed class ChangePinOtpRequest
{
    public string Otp { get; set; } = string.Empty;
    public string NewPin { get; set; } = string.Empty;
}
