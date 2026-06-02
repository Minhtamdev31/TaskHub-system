namespace TaskHub.Application.DTOs;

public class InviteRequest
{
    public string ProjectId { get; set; } = string.Empty;
    public string InvitedEmail { get; set; } = string.Empty;
}