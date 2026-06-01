namespace TaskHub.Application.DTOs;

public sealed class AddMemberDto
{
    public string Email { get; set; } = string.Empty;
    /// <summary>
    /// Project-level role: "Leader" or "Member" (default: "Member")
    /// Note: This is separate from the user's system role (Admin/Member)
    /// </summary>
    public string Role { get; set; } = "Member";
}
