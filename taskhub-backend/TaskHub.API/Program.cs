﻿using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using TaskHub.Application.Interfaces;
using TaskHub.Application.Services;
using TaskHub.API.Hubs;
using TaskHub.API.Realtime;
using TaskHub.Persistence.Context;
using TaskHub.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// ĐỊNH CẤU HÌNH CỔNG (PORT) CHO RENDER DOCKER
// ==========================================
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// Cấu hình JWT Settings
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secret = jwtSettings["Secret"];
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];

if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
{
    throw new InvalidOperationException(
        "JWT settings (Secret, Issuer, Audience) chưa được cấu hình. " +
        "Đặt biến môi trường Jwt__Secret / Jwt__Issuer / Jwt__Audience (xem DEPLOYMENT.md).");
}

// ==========================================
// FAIL-FAST: kiểm tra các secret bắt buộc đã được nạp (từ env trên Render / appsettings.Development.json khi dev).
// Bắt lỗi cấu hình ngay lúc khởi động thay vì để app chạy rồi crash mơ hồ về sau.
// ==========================================
var requiredSecrets = new (string Key, string EnvVar)[]
{
    ("MongoDbSettings:ConnectionString", "MongoDbSettings__ConnectionString"),
    ("Security:VaultEncryptionKey",      "Security__VaultEncryptionKey"),
};
var missing = requiredSecrets
    .Where(s => string.IsNullOrWhiteSpace(builder.Configuration[s.Key]))
    .Select(s => s.EnvVar)
    .ToList();
if (missing.Count > 0)
{
    throw new InvalidOperationException(
        "Thiếu cấu hình bắt buộc: " + string.Join(", ", missing) +
        ". Đặt các biến môi trường này trên Render (hoặc appsettings.Development.json khi chạy local). Xem DEPLOYMENT.md.");
}

// Trong Production không cho dùng các giá trị placeholder/mặc định nguy hiểm.
if (!builder.Environment.IsDevelopment())
{
    if (secret.Length < 32 || secret.Contains("your-super-secret-key"))
        throw new InvalidOperationException("Jwt__Secret đang là giá trị placeholder/quá ngắn. Đặt một secret ngẫu nhiên >= 32 ký tự trên Render.");
    if (builder.Configuration["Security:VaultEncryptionKey"]!.Contains("Default-Key-Change-In-Production"))
        throw new InvalidOperationException("Security__VaultEncryptionKey vẫn là giá trị mặc định. Đặt một khoá ngẫu nhiên trên Render.");
}

var key = Encoding.ASCII.GetBytes(secret);

// ==========================================
// CẤU HÌNH CORS (CHO PHÉP FRONTEND GỌI API)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // WebSocket không gửi được header Authorization → SignalR truyền token qua query string.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddScoped<IRealtimeNotifier, SignalRRealtimeNotifier>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TaskHub API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your JWT token."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Dependency Injections
builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped(typeof(IMongoRepository<>), typeof(MongoRepository<>));
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHostedService<TaskDeadlineWorker>();
builder.Services.AddSingleton<TaskHub.Application.Services.KeepAliveState>();
builder.Services.AddHostedService<TaskHub.API.Workers.KeepAliveWorker>();
builder.Services.AddScoped<IProjectInvitationService, ProjectInvitationService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISubscriptionPlanService, SubscriptionPlanService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IPasswordVaultService, PasswordVaultService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<TaskHub.Application.Interfaces.IRecaptchaService, TaskHub.Persistence.Services.RecaptchaService>();

var app = builder.Build();

// ==========================================
// SEED GÓI SUBSCRIPTION MẶC ĐỊNH (nếu DB chưa có gói nào)
// ==========================================
using (var scope = app.Services.CreateScope())
{
    try
    {
        var planService = scope.ServiceProvider.GetRequiredService<ISubscriptionPlanService>();
        var existingPlans = await planService.GetAllPlansAsync();
        if (existingPlans.Count == 0)
        {
            var defaults = new[]
            {
                new TaskHub.Application.DTOs.CreateSubscriptionPlanDto
                {
                    Name = "Premium1Thang", Title = "Premium 1 Tháng", Price = 50000, DurationDays = 30,
                    Description = "Mở khóa Password Vault, nhắc deadline & phân tích dự án."
                },
                new TaskHub.Application.DTOs.CreateSubscriptionPlanDto
                {
                    Name = "Premium1Nam", Title = "Premium 1 Năm", Price = 500000, DurationDays = 365,
                    Description = "Tiết kiệm hơn với gói 1 năm — toàn bộ đặc quyền Premium."
                }
            };
            foreach (var dto in defaults)
            {
                await planService.CreatePlanAsync(dto);
            }
            Console.WriteLine("[SEED] Đã tạo gói subscription mặc định.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR] Không seed được subscription plans: {ex.Message}");
    }
}

// ==========================================
// TẠO INDEX MONGODB (chạy 1 lần, idempotent)
// ==========================================
using (var scope = app.Services.CreateScope())
{
    try
    {
        var ctx = scope.ServiceProvider.GetRequiredService<TaskHub.Persistence.Context.MongoDbContext>();
        await ctx.EnsureIndexesAsync();
        Console.WriteLine("[INDEX] Đã đảm bảo index MongoDB.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[INDEX ERROR] {ex.Message}");
    }
}

// ==========================================
// NẠP CẤU HÌNH KEEP-ALIVE (chống ngủ đông) TỪ DB
// ==========================================
using (var scope = app.Services.CreateScope())
{
    try
    {
        var settingsRepo = scope.ServiceProvider.GetRequiredService<TaskHub.Application.Interfaces.IMongoRepository<TaskHub.Domain.Entities.AppSetting>>();
        var keepAliveState = app.Services.GetRequiredService<TaskHub.Application.Services.KeepAliveState>();
        var allSettings = await settingsRepo.GetAllAsync();
        var ka = allSettings.FirstOrDefault(s => s.Key == "KeepAlive");
        keepAliveState.Enabled = ka == null || ka.Value != "false"; // mặc định bật
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[KEEPALIVE] Không nạp được cấu hình: {ex.Message}");
    }
}

// ==========================================
// GLOBAL EXCEPTION HANDLING (LOGS TO CONSOLE)
// ==========================================
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var exceptionHandlerPathFeature = context.Features.Get<IExceptionHandlerPathFeature>();
            var exception = exceptionHandlerPathFeature?.Error;

            // This outputs to the Render console logs
            Console.WriteLine($"[CRITICAL ERROR]: {exception?.Message}");
            Console.WriteLine($"[STACK TRACE]: {exception?.StackTrace}");

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { error = "Internal Server Error. Check Render logs for details." });
        });
    });
}

app.UseRouting();
app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "TaskHub API v1");
    // Đặt dòng dưới đây để khi vào link gốc nó sẽ tự động mở thẳng giao diện Swagger luôn thay vì báo 404
    options.RoutePrefix = "swagger";
});

// Chuyển hướng trang chủ sang trang Swagger để dễ kiểm tra xem server sống hay chết
app.MapGet("/", async context =>
{
    context.Response.Redirect("/swagger/index.html");
    await Task.CompletedTask;
});

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ProjectHub>("/hubs/project");

app.Run();