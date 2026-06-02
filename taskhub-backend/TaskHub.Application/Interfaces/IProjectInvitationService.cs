using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface IProjectInvitationService
{
    Task<bool> SendInvitationAsync(string projectId, string inviterId, string invitedEmail);
    Task<List<ProjectInvitation>> GetPendingInvitationsAsync(string userEmail);
    Task<bool> RespondToInvitationAsync(string invitationId, string userId, string userEmail, bool accept);
}