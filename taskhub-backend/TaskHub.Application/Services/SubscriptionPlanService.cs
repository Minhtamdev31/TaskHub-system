using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;
using TaskHub.Application.DTOs;

namespace TaskHub.Application.Services;

public class SubscriptionPlanService : ISubscriptionPlanService
{
    private readonly IMongoRepository<SubscriptionPlan> _planRepository;

    public SubscriptionPlanService(IMongoRepository<SubscriptionPlan> planRepository)
    {
        _planRepository = planRepository;
    }

    public async Task<List<SubscriptionPlan>> GetAllPlansAsync() => await _planRepository.GetAllAsync();

    public async Task<List<SubscriptionPlan>> GetActivePlansAsync()
    {
        var all = await _planRepository.GetAllAsync();
        return all.Where(p => p.IsActive).ToList();
    }

    public async Task<SubscriptionPlan?> CreatePlanAsync(CreateSubscriptionPlanDto dto)
    {
        var plan = new SubscriptionPlan
        {
            Name = dto.Name,
            Title = dto.Title,
            Price = dto.Price,
            DurationDays = dto.DurationDays,
            Description = dto.Description
        };
        await _planRepository.CreateAsync(plan);
        return plan;
    }

    public async Task<bool> UpdatePlanAsync(string id, CreateSubscriptionPlanDto dto)
    {
        var existing = await _planRepository.GetByIdAsync(id);
        if (existing == null) return false;

        existing.Name = dto.Name;
        existing.Title = dto.Title;
        existing.Price = dto.Price;
        existing.DurationDays = dto.DurationDays;
        existing.Description = dto.Description;
        existing.UpdatedAt = DateTime.UtcNow;

        await _planRepository.UpdateAsync(id, existing);
        return true;
    }

    public async Task<bool> DeletePlanAsync(string id)
    {
        var existing = await _planRepository.GetByIdAsync(id);
        if (existing == null) return false;
        
        await _planRepository.DeleteAsync(id);
        return true;
    }
}