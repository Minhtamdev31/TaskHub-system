using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskHub.Application.Interfaces;
using TaskHub.Application.Services;
using TaskHub.Domain.Entities;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api")]
public class SystemController : ControllerBase
{
    private const string KeepAliveKey = "KeepAlive";

    private readonly KeepAliveState _keepAlive;
    private readonly IMongoRepository<AppSetting> _settings;

    public SystemController(KeepAliveState keepAlive, IMongoRepository<AppSetting> settings)
    {
        _keepAlive = keepAlive;
        _settings = settings;
    }

    // Endpoint nhẹ để worker (và uptime monitor bên ngoài) ping giữ service thức.
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health() => Ok(new { status = "ok", time = DateTime.UtcNow });

    [HttpGet("system/keep-alive")]
    [Authorize(Roles = "Admin")]
    public IActionResult GetKeepAlive() => Ok(new { enabled = _keepAlive.Enabled });

    [HttpPut("system/keep-alive")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetKeepAlive([FromBody] KeepAliveDto request)
    {
        if (request is null) return BadRequest();

        _keepAlive.Enabled = request.Enabled;

        // Lưu để giữ lựa chọn qua các lần khởi động lại.
        var all = await _settings.GetAllAsync();
        var existing = all.FirstOrDefault(s => s.Key == KeepAliveKey);
        if (existing is null)
        {
            await _settings.CreateAsync(new AppSetting { Key = KeepAliveKey, Value = request.Enabled ? "true" : "false" });
        }
        else
        {
            existing.Value = request.Enabled ? "true" : "false";
            await _settings.UpdateAsync(existing.Id, existing);
        }

        return Ok(new { enabled = _keepAlive.Enabled });
    }

    public sealed class KeepAliveDto
    {
        public bool Enabled { get; set; }
    }
}
