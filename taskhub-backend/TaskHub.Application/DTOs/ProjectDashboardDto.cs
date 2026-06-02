namespace TaskHub.Application.DTOs;

public class ProjectDashboardDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int TodoCount { get; set; }
    public int InProgressCount { get; set; }
    public int ReviewCount { get; set; }
    public int DoneCount { get; set; }
    public double CompletionPercentage { get; set; }
    public int OverdueTasksCount { get; set; }
}