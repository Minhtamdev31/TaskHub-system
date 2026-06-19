namespace TaskHub.Application.DTOs;

/// <summary>
/// Kết quả phân trang dùng chung cho các endpoint danh sách.
/// Trả về cả dữ liệu trang hiện tại lẫn metadata để client dựng nút trang.
/// </summary>
public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public long Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(Total / (double)PageSize) : 0;
}
