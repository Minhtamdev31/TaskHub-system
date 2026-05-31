using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        var response = users.Select(user => new AuthResponse(user));
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
    {
        if (request is null)
        {
            return BadRequest("Update data is required.");
        }

        if (request.Email is not null && string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("Email cannot be empty when provided.");
        }

        var updatedUser = await _userService.UpdateAsync(id, request);
        if (updatedUser is null)
        {
            return NotFound();
        }

        return Ok(new AuthResponse(updatedUser));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!await _userService.DeleteAsync(id))
        {
            return NotFound();
        }

        return NoContent();
    }
}
