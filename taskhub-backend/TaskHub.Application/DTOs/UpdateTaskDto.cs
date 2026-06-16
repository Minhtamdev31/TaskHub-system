namespace TaskHub.Application.DTOs;

public sealed class UpdateTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public DateTime? DueDate { get; set; }

    /// <summary>Khi true: xóa hạn chót (đặt DueDate về null).</summary>
    public bool ClearDueDate { get; set; }
}
