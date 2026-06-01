namespace TaskHub.Application.DTOs;

public sealed class ChangeRoleDto
{
    /// <summary>
    /// The user whose role will be changed
    /// </summary>
    public string TargetUserId { get; set; } = string.Empty;

    /// <summary>
    /// The new project role: "Leader" or "Member"
    /// </summary>
    public string NewProjectRole { get; set; } = string.Empty;
}
