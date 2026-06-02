using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Services;

/// <summary>
/// ProjectService manages project-level operations with role-based authorization.
/// 
/// Role Separation:
/// - User.Role: System-level role (Admin/Member) - controls global app access
/// - ProjectMember.ProjectRole: Project-level role (Leader/Member) - controls project access
///
/// Authorization Rules:
/// - Only Project Owner OR members with ProjectRole="Leader" can:
///   * Update project details (name, description, status, dates)
///   * Add members to the project
///   * Remove members from the project
/// - Members with ProjectRole="Member" can:
///   * View the project
///   * Manage tasks within the project
///   * Cannot modify project settings
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IMongoRepository<Project> _projectRepository;
    private readonly IMongoRepository<User> _userRepository;
    private readonly IMongoRepository<TaskItem> _taskRepository;
    private readonly INotificationService _notificationService;
    private readonly IProjectInvitationService _projectInvitationService;

    public ProjectService(
        IMongoRepository<Project> projectRepository,
        IMongoRepository<User> userRepository,
        IMongoRepository<TaskItem> taskRepository,
        INotificationService notificationService,
        IProjectInvitationService projectInvitationService)
    {
        _projectRepository = projectRepository;
        _userRepository = userRepository;
        _taskRepository = taskRepository;
        _notificationService = notificationService;
        _projectInvitationService = projectInvitationService;
    }

    public async Task<Project?> CreateProjectAsync(CreateProjectDto dto, string ownerId)
    {
        if (dto is null || string.IsNullOrEmpty(ownerId) || string.IsNullOrWhiteSpace(dto.Name))
        {
            return null;
        }

        var project = new Project
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Status = "Planning",
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            OwnerId = ownerId,
            Members = new List<ProjectMember>
            {
                new ProjectMember
                {
                    UserId = ownerId,
                    ProjectRole = "Leader"
                }
            },
            CreatedAt = DateTime.UtcNow
        };

        await _projectRepository.CreateAsync(project);
        return project;
    }

    public async Task<List<Project>> GetProjectsForUserAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return new List<Project>();
        }

        var allProjects = await _projectRepository.GetAllAsync();
        return allProjects.Where(p =>
            p.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase) ||
            p.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
        ).ToList();
    }

    public async Task<Project?> GetProjectByIdAsync(string projectId)
    {
        if (string.IsNullOrEmpty(projectId))
        {
            return null;
        }

        return await _projectRepository.GetByIdAsync(projectId);
    }

    public async Task<bool> UpdateProjectAsync(string projectId, UpdateProjectDto dto, string userId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(userId) || dto is null)
        {
            return false;
        }

        var existingProject = await GetProjectByIdAsync(projectId);
        if (existingProject is null)
        {
            return false;
        }

        var userProjectRole = existingProject.Members.FirstOrDefault(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))?.ProjectRole;
        var isOwner = existingProject.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isLeader = userProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false;

        if (!isOwner && !isLeader)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            existingProject.Name = dto.Name.Trim();
        }

        if (dto.Description is not null)
        {
            existingProject.Description = dto.Description.Trim();
        }

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            existingProject.Status = dto.Status.Trim();
        }

        if (dto.StartDate.HasValue)
        {
            existingProject.StartDate = dto.StartDate.Value;
        }

        if (dto.EndDate.HasValue)
        {
            existingProject.EndDate = dto.EndDate.Value;
        }

        existingProject.UpdatedAt = DateTime.UtcNow;
        await _projectRepository.UpdateAsync(projectId, existingProject);
        return true;
    }

    public async Task<bool> AddMemberToProjectAsync(string projectId, AddMemberDto dto, string currentUserId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(currentUserId) || dto is null || string.IsNullOrWhiteSpace(dto.Email))
        {
            return false;
        }

        var project = await GetProjectByIdAsync(projectId);
        if (project is null)
        {
            return false;
        }

        var userProjectRole = project.Members.FirstOrDefault(m => m.UserId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase))?.ProjectRole;
        var isOwner = project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase);
        var isLeader = userProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false;

        if (!isOwner && !isLeader)
        {
            return false;
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var userToAdd = await GetUserByEmailAsync(normalizedEmail);
        if (userToAdd is null)
        {
            return false;
        }

        if (project.Members.Any(m => m.UserId.Equals(userToAdd.Id, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        return await _projectInvitationService.SendInvitationAsync(projectId, currentUserId, normalizedEmail);
    }

    public async Task<bool> RemoveMemberFromProjectAsync(string projectId, string memberUserId, string currentUserId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(memberUserId) || string.IsNullOrEmpty(currentUserId))
        {
            return false;
        }

        var project = await GetProjectByIdAsync(projectId);
        if (project is null)
        {
            return false;
        }

        var userProjectRole = project.Members.FirstOrDefault(m => m.UserId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase))?.ProjectRole;
        var isOwner = project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase);
        var isLeader = userProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false;

        if (!isOwner && !isLeader)
        {
            return false;
        }

        var memberToRemove = project.Members.FirstOrDefault(m => m.UserId.Equals(memberUserId, StringComparison.OrdinalIgnoreCase));
        if (memberToRemove is null)
        {
            return false;
        }

        project.Members.Remove(memberToRemove);
        project.UpdatedAt = DateTime.UtcNow;
        await _projectRepository.UpdateAsync(projectId, project);
        return true;
    }

    public async Task<bool> ChangeMemberRoleAsync(string projectId, ChangeRoleDto dto, string currentUserId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(currentUserId) || dto is null || 
            string.IsNullOrEmpty(dto.TargetUserId) || string.IsNullOrWhiteSpace(dto.NewProjectRole))
        {
            return false;
        }

        var project = await GetProjectByIdAsync(projectId);
        if (project is null)
        {
            return false;
        }

        // Determine current user's authorization level
        var isOwner = project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase);
        var currentUserMember = project.Members.FirstOrDefault(m => m.UserId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase));
        var isLeader = currentUserMember?.ProjectRole?.Equals("Leader", StringComparison.OrdinalIgnoreCase) ?? false;

        // Only Owner or Leader can change roles
        if (!isOwner && !isLeader)
        {
            return false;
        }

        // Prevent anyone from changing the Owner's role
        if (dto.TargetUserId.Equals(project.OwnerId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Find the target member
        var targetMember = project.Members.FirstOrDefault(m => m.UserId.Equals(dto.TargetUserId, StringComparison.OrdinalIgnoreCase));
        if (targetMember is null)
        {
            return false;
        }

        // Validate the new role
        var normalizedNewRole = dto.NewProjectRole?.Trim();
        if (string.IsNullOrEmpty(normalizedNewRole) ||
            (!normalizedNewRole.Equals("Leader", StringComparison.OrdinalIgnoreCase) && 
            !normalizedNewRole.Equals("Member", StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        // Update the target member's role
        targetMember.ProjectRole = normalizedNewRole;
        project.UpdatedAt = DateTime.UtcNow;
        await _projectRepository.UpdateAsync(projectId, project);
        return true;
    }

    public async Task<ProjectDashboardDto?> GetProjectDashboardAsync(string projectId, string userId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(userId))
        {
            return null;
        }

        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return null;
        }

        var isOwner = project.OwnerId.Equals(userId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isMember)
        {
            return null;
        }

        var allTasks = await _taskRepository.GetAllAsync();
        var projectTasks = allTasks.Where(t => t.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase)).ToList();

        var dashboard = new ProjectDashboardDto
        {
            ProjectId = projectId,
            ProjectName = project.Name,
            TotalTasks = projectTasks.Count,
            TodoCount = projectTasks.Count(t => t.Status.Equals("Todo", StringComparison.OrdinalIgnoreCase)),
            InProgressCount = projectTasks.Count(t => t.Status.Equals("InProgress", StringComparison.OrdinalIgnoreCase)),
            ReviewCount = projectTasks.Count(t => t.Status.Equals("Review", StringComparison.OrdinalIgnoreCase)),
            DoneCount = projectTasks.Count(t => t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase)),
            OverdueTasksCount = projectTasks.Count(t => t.DueDate.HasValue && t.DueDate.Value < DateTime.UtcNow && !t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase))
        };

        dashboard.CompletionPercentage = dashboard.TotalTasks > 0 ? Math.Round(((double)dashboard.DoneCount / dashboard.TotalTasks) * 100, 1) : 0;

        return dashboard;
    }

    public async Task<List<MemberContributionDto>> GetMemberContributionsAsync(string projectId, string currentUserId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(currentUserId))
        {
            return new List<MemberContributionDto>();
        }

        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null) return new List<MemberContributionDto>();

        // Authorization: Check if user is owner or member
        var isOwner = project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase);
        var isMember = project.Members.Any(m => m.UserId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase));

        if (!isOwner && !isMember) return new List<MemberContributionDto>();

        var allTasks = await _taskRepository.GetAllAsync();
        var projectTasks = allTasks.Where(t => t.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase)).ToList();
        var totalProjectTasks = projectTasks.Count;

        // Combine Owner and Members into a list of IDs to track
        var memberIds = project.Members.Select(m => m.UserId).ToList();
        if (!memberIds.Contains(project.OwnerId)) memberIds.Add(project.OwnerId);

        var allUsers = await _userRepository.GetAllAsync();
        var projectUsers = allUsers.Where(u => memberIds.Contains(u.Id)).ToList();

        var contributions = new List<MemberContributionDto>();
        var now = DateTime.UtcNow;

        foreach (var user in projectUsers)
        {
            var userTasks = projectTasks.Where(t => t.UserId.Equals(user.Id, StringComparison.OrdinalIgnoreCase)).ToList();
            
            var dto = new MemberContributionDto
            {
                UserId = user.Id,
                Username = user.Username,
                Email = user.Email,
                TotalAssignedTasks = userTasks.Count,
                CompletedTasks = userTasks.Count(t => t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase)),
                InProgressTasks = userTasks.Count(t => t.Status.Equals("InProgress", StringComparison.OrdinalIgnoreCase) || 
                                                     t.Status.Equals("Review", StringComparison.OrdinalIgnoreCase)),
                OverdueTasks = userTasks.Count(t => t.DueDate.HasValue && t.DueDate.Value < now && !t.Status.Equals("Done", StringComparison.OrdinalIgnoreCase)),
                ContributionPercentage = totalProjectTasks > 0 ? Math.Round(((double)userTasks.Count / totalProjectTasks) * 100, 1) : 0
            };
            contributions.Add(dto);
        }

        return contributions;
    }

    public async Task<bool> DeleteProjectAsync(string projectId, string currentUserId)
    {
        if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(currentUserId))
        {
            return false;
        }

        var project = await GetProjectByIdAsync(projectId);
        if (project is null)
        {
            return false;
        }

        // Only the project owner can delete the project
        if (!project.OwnerId.Equals(currentUserId, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Delete all tasks associated with this project (Cascade Delete)
        var allTasks = await _taskRepository.GetAllAsync();
        var tasksToDelete = allTasks
            .Where(t => !string.IsNullOrEmpty(t.ProjectId) && 
                       t.ProjectId.Equals(projectId, StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var task in tasksToDelete)
        {
            await _taskRepository.DeleteAsync(task.Id);
        }

        // Delete the project itself
        await _projectRepository.DeleteAsync(projectId);
        return true;
    }

    private async Task<User?> GetUserByEmailAsync(string email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return null;
        }

        var allUsers = await _userRepository.GetAllAsync();
        return allUsers.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
    }
}
