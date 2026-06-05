﻿﻿﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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
        private readonly IOtpService _otpService;
        private readonly IRecaptchaService _recaptchaService;

        public AuthController(
            IUserService userService, 
            ITokenService tokenService, 
            IAuthService authService, 
            IOtpService otpService,
            IRecaptchaService recaptchaService)
        {
            _userService = userService;
            _tokenService = tokenService;
            _authService = authService;
            _otpService = otpService;
            _recaptchaService = recaptchaService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!await _recaptchaService.VerifyTokenAsync(request.CaptchaToken))
            {
                return BadRequest(new { message = "Xác thực reCAPTCHA thất bại. Bạn có phải là robot?" });
            }

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Username, email and password are required.");
            }

            var allUsers = await _userService.GetAllAsync();
            if (allUsers.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest("Email already registered.");
            }

            if (allUsers.Any(u => u.Username.Equals(request.Username, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest("Username already taken. Please choose another one.");
            }

            await _otpService.GenerateAndSendOtpAsync(request.Email, "Register");
            return Ok("An OTP code has been sent to your email. Please verify to complete registration.");
        }

        [HttpPost("verify-register-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyRegisterOtp([FromBody] VerifyRegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.OtpCode))
            {
                return BadRequest("Username, email, password and OTP code are required.");
            }

            var isValid = await _otpService.VerifyOtpAsync(request.Email, request.OtpCode, "Register");
            if (!isValid)
            {
                return BadRequest("Invalid or expired OTP.");
            }

            var user = await _userService.RegisterAsync(request.Username, request.Email, request.Password);
            if (user is null)
            {
                return BadRequest("Registration failed. Email or Username may already be in use.");
            }

            return Ok("Registration successful! You can now log in.");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!await _recaptchaService.VerifyTokenAsync(request.CaptchaToken))
            {
                return BadRequest(new { message = "Xác thực reCAPTCHA thất bại. Bạn có phải là robot?" });
            }

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

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            await _otpService.GenerateAndSendOtpAsync(request.Email, "ResetPassword");
            return Ok("OTP sent to your email.");
        }

        [HttpPost("verify-reset-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyOtpRequest request)
        {
            var isValid = await _otpService.VerifyOtpAsync(request.Email, request.OtpCode, "ResetPassword");
            if (!isValid)
            {
                return BadRequest("Invalid or expired OTP.");
            }

            return Ok("OTP valid. Proceed to change password.");
        }
    }
}
