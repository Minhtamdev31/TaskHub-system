using TaskHub.Application.Services;

namespace TaskHub.API.Workers;

/// <summary>
/// Tự ping endpoint /api/health theo chu kỳ để service không bị Render đưa vào "ngủ đông"
/// sau ~15 phút không có request. Chỉ chạy khi admin bật (KeepAliveState.Enabled) và đã
/// cấu hình được URL công khai (env RENDER_EXTERNAL_URL hoặc App:PublicUrl).
/// </summary>
public class KeepAliveWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(10);

    private readonly KeepAliveState _state;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<KeepAliveWorker> _logger;
    private readonly string? _baseUrl;

    public KeepAliveWorker(
        KeepAliveState state,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<KeepAliveWorker> logger)
    {
        _state = state;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _baseUrl = (Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL")
                    ?? configuration["App:PublicUrl"])?.TrimEnd('/');
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_baseUrl))
        {
            _logger.LogInformation("KeepAlive: chưa cấu hình URL công khai, worker không chạy.");
            return;
        }

        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            if (!_state.Enabled) continue;

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);
                var res = await client.GetAsync($"{_baseUrl}/api/health", stoppingToken);
                _logger.LogInformation("KeepAlive ping {Url} -> {Status}", _baseUrl, (int)res.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "KeepAlive ping thất bại.");
            }
        }
    }
}
