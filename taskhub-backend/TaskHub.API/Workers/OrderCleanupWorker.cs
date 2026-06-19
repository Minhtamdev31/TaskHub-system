using TaskHub.Application.Interfaces;

namespace TaskHub.API.Workers;

/// <summary>
/// Định kỳ quét các đơn hàng còn "Pending" quá lâu (người dùng bỏ ngang, link PayOS hết hạn)
/// và chuyển sang "Cancelled" để không kẹt ở trạng thái "Đang xử lý" mãi.
/// </summary>
public class OrderCleanupWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan PendingMaxAge = TimeSpan.FromMinutes(30);

    private readonly IServiceProvider _services;
    private readonly ILogger<OrderCleanupWorker> _logger;

    public OrderCleanupWorker(IServiceProvider services, ILogger<OrderCleanupWorker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // BackgroundService là singleton — phải tạo scope để lấy service scoped (PaymentService).
                using var scope = _services.CreateScope();
                var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                var count = await paymentService.ExpireStalePendingOrdersAsync(PendingMaxAge);
                if (count > 0)
                {
                    _logger.LogInformation("[ORDER CLEANUP] Đã hủy {Count} đơn Pending quá hạn.", count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ORDER CLEANUP] Lỗi khi dọn đơn quá hạn.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
