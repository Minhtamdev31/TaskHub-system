using TaskHub.Application.Interfaces;
using TaskHub.Persistence.Context;
using TaskHub.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();


builder.Services.AddOpenApi();

builder.Services.AddSingleton<MongoDbContext>();

builder.Services.AddScoped(typeof(IMongoRepository<>), typeof(MongoRepository<>));


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapControllers();


app.Run();