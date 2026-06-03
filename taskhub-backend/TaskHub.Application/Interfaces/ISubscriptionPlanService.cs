using TaskHub.Domain.Entities;
using TaskHub.Application.DTOs;

namespace TaskHub.Application.Interfaces;

public interface ISubscriptionPlanService
{
    Task<List<SubscriptionPlan>> GetAllPlansAsync();
    Task<List<SubscriptionPlan>> GetActivePlansAsync();
    Task<SubscriptionPlan?> CreatePlanAsync(CreateSubscriptionPlanDto dto);
    Task<bool> UpdatePlanAsync(string id, CreateSubscriptionPlanDto dto);
    Task<bool> DeletePlanAsync(string id);
}