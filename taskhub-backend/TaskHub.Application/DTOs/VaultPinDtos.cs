namespace TaskHub.Application.DTOs;

public sealed class VaultPinDto
{
    public string Pin { get; set; } = string.Empty;
}

public sealed class ChangeVaultPinDto
{
    public string OldPin { get; set; } = string.Empty;
    public string NewPin { get; set; } = string.Empty;
}
