using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using TaskHub.Application.DTOs;
using TaskHub.Application.Interfaces;

namespace TaskHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpPost]
    public async Task<IActionResult> AddComment([FromBody] CreateCommentDto request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Content) || string.IsNullOrWhiteSpace(request.TaskId))
        {
            return BadRequest("Content and TaskId are required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var comment = await _commentService.AddCommentAsync(request, userId);
        if (comment is null)
        {
            return BadRequest("Unable to add comment. Verify task existence and project membership.");
        }

        return CreatedAtAction(nameof(GetCommentsByTaskId), new { taskId = comment.TaskId }, new CommentResponse(comment));
    }

    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetCommentsByTaskId(string taskId)
    {
        if (string.IsNullOrWhiteSpace(taskId))
        {
            return BadRequest("TaskId is required.");
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("User ID not found in token.");
        }

        var comments = await _commentService.GetCommentsByTaskIdAsync(taskId, userId);
        var response = comments.Select(comment => new CommentResponse(comment));
        return Ok(response);
    }
}
