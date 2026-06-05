namespace TaskHub.Application.Interfaces;

public interface IRecaptchaService
{
    Task<bool> VerifyTokenAsync(string token);
}