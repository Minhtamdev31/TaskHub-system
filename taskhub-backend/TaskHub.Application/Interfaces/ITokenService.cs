using TaskHub.Domain.Entities;

namespace TaskHub.Application.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user);
}
