# Stage 1: Base runtime environment
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Stage 2: Build and Restore
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy all .csproj files first to leverage Docker layer caching for restore
COPY ["taskhub-backend/TaskHub.API/TaskHub.API.csproj", "taskhub-backend/TaskHub.API/"]
COPY ["taskhub-backend/TaskHub.Application/TaskHub.Application.csproj", "taskhub-backend/TaskHub.Application/"]
COPY ["taskhub-backend/TaskHub.Domain/TaskHub.Domain.csproj", "taskhub-backend/TaskHub.Domain/"]
COPY ["taskhub-backend/TaskHub.Persistence/TaskHub.Persistence.csproj", "taskhub-backend/TaskHub.Persistence/"]

# Restore dependencies
RUN dotnet restore "taskhub-backend/TaskHub.API/TaskHub.API.csproj"

# Copy the remaining source files
COPY . .

# Build the project
WORKDIR "/src/taskhub-backend/TaskHub.API"
RUN dotnet build "TaskHub.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Stage 3: Publish the application
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "TaskHub.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Stage 4: Final production image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TaskHub.API.dll"]
