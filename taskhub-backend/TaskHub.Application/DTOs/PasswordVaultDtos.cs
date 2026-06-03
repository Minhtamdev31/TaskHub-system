using System;
using TaskHub.Domain.Entities;

namespace TaskHub.Application.DTOs;

public class AddCredentialDto
{
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
}

public class CredentialResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public CredentialResponseDto(PasswordVaultItem item, string decryptedPassword)
    {
        Id = item.Id;
        Title = item.Title;
        Url = item.Url;
        Username = item.Username;
        Password = decryptedPassword;
        Note = item.Note;
        CreatedAt = item.CreatedAt;
    }
}