using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using TaskHub.Application.Interfaces;
using TaskHub.Application.Services;
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
    throw new InvalidOperationException("JWT settings (Secret, Issuer, Audience) are not configured.");
}

var key = Encoding.ASCII.GetBytes(secret);

// ==========================================
// CẤU HÌNH CORS (CHO PHÉP FRONTEND GỌI API)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
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
});

builder.Services.AddAuthorization();
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
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHostedService<TaskDeadlineWorker>();
builder.Services.AddScoped<IProjectInvitationService, ProjectInvitationService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISubscriptionPlanService, SubscriptionPlanService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<TaskHub.Application.Interfaces.IRecaptchaService, TaskHub.Persistence.Services.RecaptchaService>();

var app = builder.Build();

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
app.UseCors("AllowFrontend");

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

app.Run();