namespace TaskHub.Application.DTOs;

public sealed class TransferOwnershipDto
{
    /// <summary>
    /// The member who will become the new project owner.
    /// </summary>
    public string NewOwnerUserId { get; set; } = string.Empty;
}
