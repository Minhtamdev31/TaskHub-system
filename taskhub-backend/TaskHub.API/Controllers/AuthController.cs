using Microsoft.AspNetCore.Mvc;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;
        private readonly IAuthService _authService;

        public AuthController(IUserService userService, ITokenService tokenService, IAuthService authService)
        {
            _userService = userService;
            _tokenService = tokenService;
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Username, email and password are required.");
            }

            var user = await _userService.RegisterAsync(request.Username, request.Email, request.Password);
            if (user is null)
            {
                return Conflict("Email is already registered.");
            }

            var token = _tokenService.GenerateToken(user);
            return CreatedAtAction(nameof(Register), new { id = user.Id }, new AuthResponse(user, token));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required.");
            }

            var user = await _userService.LoginAsync(request.Email, request.Password);
            if (user is null)
            {
                return Unauthorized("Invalid email or password.");
            }

            var token = _tokenService.GenerateToken(user);
            return Ok(new TokenResponse(token));
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
            {
                return BadRequest("IdToken is required.");
            }

            var token = await _authService.GoogleLoginAsync(request.IdToken);
            if (token is null)
            {
                return Unauthorized("Invalid Google token or user creation failed.");
            }

            return Ok(new TokenResponse(token));
        }
    }
}
