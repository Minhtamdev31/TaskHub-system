using Microsoft.Extensions.Caching.Memory;
using TaskHub.Application.Interfaces;
using TaskHub.Domain.Entities;
using TaskHub.Application.DTOs;

namespace TaskHub.Application.Services;

public class SubscriptionPlanService : ISubscriptionPlanService
{
    private readonly IMongoRepository<SubscriptionPlan> _planRepository;
    private readonly IMemoryCache _cache;

    // Khóa cache cho danh sách gói đang bật. Gói đổi rất ít nên cache 10 phút,
    // đồng thời xóa ngay khi admin thêm/sửa/xóa (xem InvalidatePlansCache).
    private const string ActivePlansCacheKey = "subscription_plans_active";
    private static readonly TimeSpan PlansCacheTtl = TimeSpan.FromMinutes(10);

    public SubscriptionPlanService(IMongoRepository<SubscriptionPlan> planRepository, IMemoryCache cache)
    {
        _planRepository = planRepository;
        _cache = cache;
    }

    public async Task<List<SubscriptionPlan>> GetAllPlansAsync() => await _planRepository.GetAllAsync();

    public async Task<List<SubscriptionPlan>> GetActivePlansAsync()
    {
        // Cache hit → trả thẳng từ RAM, không chạm DB. Cache miss (lần đầu / sau khi hết hạn
        // hoặc bị xóa) → factory dưới đây chạy, lấy từ DB rồi lưu lại.
        return await _cache.GetOrCreateAsync(ActivePlansCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = PlansCacheTtl;
            var all = await _planRepository.GetAllAsync();
            return all.Where(p => p.IsActive).ToList();
        }) ?? new List<SubscriptionPlan>();
    }

    // Xóa cache để lần đọc kế tiếp lấy lại bản mới từ DB (cache invalidation).
    private void InvalidatePlansCache() => _cache.Remove(ActivePlansCacheKey);

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
        InvalidatePlansCache();
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
        InvalidatePlansCache();
        return true;
    }

    public async Task<bool> DeletePlanAsync(string id)
    {
        var existing = await _planRepository.GetByIdAsync(id);
        if (existing == null) return false;
        
        await _planRepository.DeleteAsync(id);
        InvalidatePlansCache();
        return true;
    }
}