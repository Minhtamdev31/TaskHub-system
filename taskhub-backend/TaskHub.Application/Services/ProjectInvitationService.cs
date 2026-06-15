using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

public class ProjectInvitationService : IProjectInvitationService
{
    private readonly IMongoRepository<ProjectInvitation> _invitationRepository;
    private readonly IMongoRepository<Project> _projectRepository;
    private readonly IMongoRepository<User> _userRepository;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public ProjectInvitationService(
        IMongoRepository<ProjectInvitation> invitationRepository,
        IMongoRepository<Project> projectRepository,
        IMongoRepository<User> userRepository,
        INotificationService notificationService,
        IEmailService emailService)
    {
        _invitationRepository = invitationRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    public async Task<bool> SendInvitationAsync(string projectId, string inviterId, string invitedEmail)
    {
        var project = await _projectRepository.GetByIdAsync(projectId);
        var inviter = await _userRepository.GetByIdAsync(inviterId);

        if (project == null || inviter == null) return false;

        // Check for existing pending invitation
        var allInvitations = await _invitationRepository.GetAllAsync();
        var exists = allInvitations.Any(i => 
            i.ProjectId == projectId && 
            i.InvitedEmail.Equals(invitedEmail, StringComparison.OrdinalIgnoreCase) && 
            i.Status == "Pending");

        if (exists) return false;

        var invitation = new ProjectInvitation
        {
            ProjectId = projectId,
            ProjectName = project.Name,
            InviterId = inviterId,
            InviterName = inviter.Username,
            InvitedEmail = invitedEmail.Trim().ToLowerInvariant(),
            Status = "Pending"
        };

        await _invitationRepository.CreateAsync(invitation);

        // Notify recipient
        var targetUser = (await _userRepository.GetAllAsync())
            .FirstOrDefault(u => u.Email.Equals(invitedEmail, StringComparison.OrdinalIgnoreCase));

        string message = $"{inviter.Username} đã mời bạn tham gia dự án: {project.Name}";

        if (targetUser != null)
        {
            // In-app + Email
            await _notificationService.CreateAndSendNotificationAsync(targetUser.Id, message, "Project", projectId, true);
        }
        else
        {
            // Gmail only for non-registered users
            await _emailService.SendEmailAsync(invitedEmail, "Lời mời tham gia dự án - TaskHub", $"<h3>Lời mời tham gia dự án</h3><p>{message}</p><p>Đăng ký TaskHub để chấp nhận lời mời!</p>");
        }

        return true;
    }

    public async Task<List<ProjectInvitation>> GetPendingInvitationsAsync(string userEmail)
    {
        var all = await _invitationRepository.GetAllAsync();
        return all.Where(i => 
            i.InvitedEmail.Equals(userEmail, StringComparison.OrdinalIgnoreCase) && 
            i.Status == "Pending")
            .OrderByDescending(i => i.CreatedAt)
            .ToList();
    }

    public async Task<bool> RespondToInvitationAsync(string invitationId, string userId, string userEmail, bool accept)
    {
        var invitation = await _invitationRepository.GetByIdAsync(invitationId);

        // SECURITY CHECK: Verify existence, status, and email ownership
        if (invitation == null || 
            !invitation.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase) || 
            !invitation.InvitedEmail.Equals(userEmail, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (accept)
        {
            invitation.Status = "Accepted";
            var project = await _projectRepository.GetByIdAsync(invitation.ProjectId);
            if (project is not null)
            {
                // Prevent duplicate membership
                if (!project.Members.Any(m => m.UserId == userId))
                {
                    project.Members.Add(new ProjectMember 
                    { 
                        UserId = userId, 
                        ProjectRole = "Member" 
                    });
                    project.UpdatedAt = DateTime.UtcNow;
                    await _projectRepository.UpdateAsync(project.Id, project);
                }
            }
        }
        else
        {
            invitation.Status = "Rejected";
        }

        // Save the updated invitation status
        await _invitationRepository.UpdateAsync(invitationId, invitation);

        // Notify the project owner (Inviter) about the response
        var respondent = await _userRepository.GetByIdAsync(userId);
        string respondentName = respondent?.Username ?? userEmail;
        string action = accept ? "chấp nhận" : "từ chối";
        string notificationMessage = $"{respondentName} đã {action} lời mời tham gia dự án: {invitation.ProjectName}";

        await _notificationService.CreateAndSendNotificationAsync(
            invitation.InviterId, 
            notificationMessage, 
            "Project", 
            invitation.ProjectId, 
            true);

        return true;
    }
}