/**
 * Example: Cách sử dụng API config trong React components
 */

import { authAPI, userAPI, projectAPI, taskAPI } from "../api/config";

// Example 1: Login
export async function handleLogin(email, password) {
  try {
    const response = await authAPI.login({ email, password });
    localStorage.setItem("token", response.token);
    console.log("Login successful!");
    return response;
  } catch (error) {
    console.error("Login failed:", error.message);
  }
}

// Example 2: Get current user
export async function loadCurrentUser() {
  try {
    const user = await userAPI.getCurrentUser();
    console.log("Current user:", user);
    return user;
  } catch (error) {
    console.error("Failed to load user:", error.message);
  }
}

// Example 3: Get all projects
export async function loadProjects() {
  try {
    const projects = await projectAPI.getAllProjects();
    console.log("Projects:", projects);
    return projects;
  } catch (error) {
    console.error("Failed to load projects:", error.message);
  }
}

// Example 4: Create new task
export async function createNewTask(projectId, title, description, dueDate) {
  try {
    const task = await taskAPI.createTask({
      title,
      description,
      dueDate,
      projectId,
    });
    console.log("Task created:", task);
    return task;
  } catch (error) {
    console.error("Failed to create task:", error.message);
  }
}

// Example 5: Update task status
export async function updateTaskStatus(taskId, status) {
  try {
    const updatedTask = await taskAPI.updateTask(taskId, { status });
    console.log("Task updated:", updatedTask);
    return updatedTask;
  } catch (error) {
    console.error("Failed to update task:", error.message);
  }
}

// Sử dụng trong React component:
// import { handleLogin, loadProjects } from './api/examples';
//
// function LoginPage() {
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const response = await handleLogin(email, password);
//     if (response) {
//       navigate('/dashboard');
//     }
//   };
//   ...
// }
