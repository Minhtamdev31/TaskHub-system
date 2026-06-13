namespace TaskHub.Application.DTOs;

public sealed class GrantPremiumRequest
{
    /// <summary>Số ngày Premium. 0 hoặc bỏ trống = Premium vĩnh viễn (không hết hạn).</summary>
    public int DurationDays { get; set; } = 30;
}
