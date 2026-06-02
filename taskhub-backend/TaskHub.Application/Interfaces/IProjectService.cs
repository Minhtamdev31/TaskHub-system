using TaskHub.Application.DTOs;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface IProjectService
{
    Task<Project?> CreateProjectAsync(CreateProjectDto dto, string ownerId);
    Task<List<Project>> GetProjectsForUserAsync(string userId);
    Task<Project?> GetProjectByIdAsync(string projectId);
    Task<bool> UpdateProjectAsync(string projectId, UpdateProjectDto dto, string userId);
    Task<bool> AddMemberToProjectAsync(string projectId, AddMemberDto dto, string currentUserId);
    Task<bool> RemoveMemberFromProjectAsync(string projectId, string memberUserId, string currentUserId);
    Task<bool> ChangeMemberRoleAsync(string projectId, ChangeRoleDto dto, string currentUserId);
    Task<bool> DeleteProjectAsync(string projectId, string currentUserId);
    Task<ProjectDashboardDto?> GetProjectDashboardAsync(string projectId, string userId);
    Task<List<MemberContributionDto>> GetMemberContributionsAsync(string projectId, string currentUserId);
}
