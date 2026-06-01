using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public sealed class ProjectResponse
{
    public ProjectResponse(Project project)
    {
        if (project is null)
        {
            throw new ArgumentNullException(nameof(project));
        }

        Id = project.Id ?? string.Empty;
        Name = project.Name ?? string.Empty;
        Description = project.Description ?? string.Empty;
        Status = project.Status ?? "Planning";
        StartDate = project.StartDate;
        EndDate = project.EndDate;
        OwnerId = project.OwnerId ?? string.Empty;
        Members = project.Members?.Select(m => new ProjectMemberResponse
        {
            UserId = m.UserId,
            ProjectRole = m.ProjectRole
        }).ToList() ?? new();
        CreatedAt = project.CreatedAt;
        UpdatedAt = project.UpdatedAt;
    }

    public string Id { get; }
    public string Name { get; }
    public string Description { get; }
    public string Status { get; }
    public DateTime? StartDate { get; }
    public DateTime? EndDate { get; }
    public string OwnerId { get; }
    public List<ProjectMemberResponse> Members { get; }
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; }
}

public sealed class ProjectMemberResponse
{
    public string UserId { get; set; } = string.Empty;
    public string ProjectRole { get; set; } = string.Empty;
}
