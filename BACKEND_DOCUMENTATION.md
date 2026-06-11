# TaskHub Backend API - Complete Documentation

## 📍 API Base URL & Configuration

- **Server Port**: 8080 (configurable via PORT environment variable)
- **Database**: MongoDB (TaskHubDB)
- **Authentication**: JWT Bearer Token
- **CORS**: AllowAll policy enabled (frontend can call from any origin)

### Configuration (appsettings.json)

```
MongoDb: mongodb+srv://sa:12345@cluster0.w4uxyht.mongodb.net/TaskHubDB
JWT Secret: your-super-secret-key-that-is-at-least-32-characters-long-for-HS256
JWT Expiry: 60 minutes
Google ClientId: 523086170118-8hmdpvtjno80u4pp3cq1o6i9vddd7t0b
Email: tamtmse183625@fpt.edu.vn (Gmail SMTP)
PayOS Integration: Available for payments
```

---

## 🔐 Authentication Endpoints

### 1. Register User

**POST** `/api/auth/register`

```json
Request:
{
  "username": "string",
  "email": "string",
  "password": "string"
}

Response:
"An OTP code has been sent to your email. Please verify to complete registration."
```

### 2. Verify Register OTP

**POST** `/api/auth/verify-register-otp`

```json
Request:
{
  "username": "string",
  "email": "string",
  "password": "string",
  "otpCode": "string"
}

Response:
"Registration successful! You can now log in."
```

### 3. Login

**POST** `/api/auth/login`

```json
Request:
{
  "email": "string",
  "password": "string"
}

Response:
{
  "token": "JWT_TOKEN_HERE"
}
```

### 4. Google Login

**POST** `/api/auth/google-login`

```json
Request:
{
  "idToken": "string"
}

Response:
{
  "token": "JWT_TOKEN_HERE"
}
```

### 5. Forgot Password

**POST** `/api/auth/forgot-password` (AllowAnonymous)

```json
Request:
{
  "email": "string"
}

Response:
"OTP sent to your email."
```

### 6. Verify Reset OTP

**POST** `/api/auth/verify-reset-otp` (AllowAnonymous)

```json
Request:
{
  "email": "string",
  "otpCode": "string"
}

Response:
"OTP valid. Proceed to change password."
```

---

## 👥 User Endpoints (Requires Authentication)

### 1. Get Current User Profile

**GET** `/api/users/me` (Authorized)

```json
Response:
{
  "id": "string (ObjectId)",
  "username": "string",
  "email": "string",
  "subscription": {
    "plan": "Free|Premium",
    "status": "Active",
    "startDate": "datetime",
    "endDate": "datetime?",
    "isPremium": boolean,
    "premiumUntil": "datetime?"
  },
  "role": "Member|Admin",
  "profile": {
    "fullName": "string",
    "avatarUrl": "string (URL)",
    "bio": "string",
    "phoneNumber": "string",
    "jobTitle": "string"
  }
}
```

### 2. Update User Profile

**PUT** `/api/users/me/profile` (Authorized)

```json
Request:
{
  "fullName": "string?",
  "avatarUrl": "string?",
  "bio": "string?",
  "phoneNumber": "string?",
  "jobTitle": "string?"
}

Response: Updated AuthResponse
```

### 3. Get All Users (Admin Only)

**GET** `/api/users` (Roles: Admin)

```json
Response: AuthResponse[]
```

### 4. Get User by ID (Admin Only)

**GET** `/api/users/{id}` (Roles: Admin)

```json
Response: AuthResponse
```

### 5. Update User (Admin Only)

**PUT** `/api/users/{id}` (Roles: Admin)

```json
Request:
{
  "email": "string?",
  "role": "string?",
  "isActive": boolean?
}

Response: AuthResponse
```

### 6. Delete User (Admin Only)

**DELETE** `/api/users/{id}` (Roles: Admin)

```json
Response: 204 No Content
```

---

## 📋 Project Endpoints (Requires Authentication)

### 1. Create Project

**POST** `/api/projects` (Authorized)

```json
Request:
{
  "name": "string (required)",
  "description": "string",
  "startDate": "datetime?",
  "endDate": "datetime?"
}

Response:
{
  "id": "string (ObjectId)",
  "name": "string",
  "description": "string",
  "status": "Planning|Active|Completed|Archived",
  "startDate": "datetime?",
  "endDate": "datetime?",
  "ownerId": "string",
  "members": [
    {
      "userId": "string",
      "projectRole": "Owner|Member|Viewer"
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime?"
}
```

### 2. Get All Projects

**GET** `/api/projects` (Authorized)

```json
Response: ProjectResponse[]
```

### 3. Get Project by ID

**GET** `/api/projects/{id}` (Authorized)

```json
Response: ProjectResponse
```

### 4. Update Project

**PUT** `/api/projects/{id}` (Authorized - Owner only)

```json
Request:
{
  "name": "string?",
  "description": "string?",
  "status": "string?",
  "startDate": "datetime?",
  "endDate": "datetime?"
}

Response: ProjectResponse
```

### 5. Delete Project

**DELETE** `/api/projects/{id}` (Authorized - Owner only)

```json
Response: 204 No Content
```

### 6. Add Member to Project

**POST** `/api/projects/{id}/members` (Authorized - Owner only)

```json
Request:
{
  "userId": "string",
  "projectRole": "Member|Viewer"
}

Response: ProjectResponse
```

### 7. Remove Member from Project

**DELETE** `/api/projects/{id}/members/{userId}` (Authorized - Owner only)

```json
Response: 204 No Content
```

---

## ✅ Task Endpoints (Requires Authentication)

### 1. Get All Tasks

**GET** `/api/tasks` (Authorized)

```json
Response:
[
  {
    "id": "string (ObjectId)",
    "title": "string",
    "description": "string",
    "status": "Todo|InProgress|Done|Cancelled",
    "dueDate": "datetime?",
    "userId": "string (assigned to)",
    "projectId": "string",
    "createdAt": "datetime",
    "updatedAt": "datetime?"
  }
]
```

### 2. Get Task by ID

**GET** `/api/tasks/{id}` (Authorized)

```json
Response: TaskResponse
```

### 3. Create Task

**POST** `/api/tasks` (Authorized)

```json
Request:
{
  "title": "string (required)",
  "description": "string",
  "dueDate": "datetime?",
  "projectId": "string (required)"
}

Response: TaskResponse
```

### 4. Update Task

**PUT** `/api/tasks/{id}` (Authorized - Owner/Assignee only)

```json
Request:
{
  "title": "string?",
  "description": "string?",
  "status": "string?",
  "dueDate": "datetime?"
}

Response: TaskResponse
```

### 5. Delete Task

**DELETE** `/api/tasks/{id}` (Authorized - Owner only)

```json
Response: 204 No Content
```

### 6. Get Tasks by Project

**GET** `/api/tasks/project/{projectId}` (Authorized)

```json
Response: TaskResponse[]
```

### 7. Assign Task to User

**PUT** `/api/tasks/{id}/assign` (Authorized - Owner only)

```json
Request:
{
  "targetUserId": "string"
}

Response: TaskResponse
```

---

## 💬 Comment Endpoints (Requires Authentication)

### 1. Add Comment

**POST** `/api/comments` (Authorized)

```json
Request:
{
  "content": "string (required)",
  "taskId": "string (required)"
}

Response:
{
  "id": "string (ObjectId)",
  "content": "string",
  "taskId": "string",
  "userId": "string",
  "createdAt": "datetime"
}
```

### 2. Get Comments by Task

**GET** `/api/comments/task/{taskId}` (Authorized)

```json
Response: CommentResponse[]
```

---

## 🔔 Notification Endpoints (Requires Authentication)

### 1. Get My Notifications

**GET** `/api/notifications` (Authorized)

```json
Response:
[
  {
    "id": "string (ObjectId)",
    "userId": "string",
    "message": "string",
    "isRead": boolean,
    "type": "Project|Task|Deadline",
    "referenceId": "string (ProjectId or TaskId)",
    "createdAt": "datetime"
  }
]
```

### 2. Mark Notification as Read

**PUT** `/api/notifications/{id}/read` (Authorized)

```json
Response: 204 No Content
```

---

## 📧 Project Invitation Endpoints (Requires Authentication)

### 1. Invite User to Project

**POST** `/api/projectinvitations/invite` (Authorized)

```json
Request:
{
  "projectId": "string",
  "invitedEmail": "string"
}

Response:
{
  "message": "Invitation sent successfully."
}
```

### 2. Get My Invitations

**GET** `/api/projectinvitations/my-invitations` (Authorized)

```json
Response:
[
  {
    "id": "string (ObjectId)",
    "projectId": "string",
    "projectName": "string",
    "inviterId": "string",
    "inviterName": "string",
    "invitedEmail": "string",
    "status": "Pending|Accepted|Rejected",
    "createdAt": "datetime"
  }
]
```

### 3. Respond to Invitation

**POST** `/api/projectinvitations/{id}/respond` (Authorized)

```json
Request:
{
  "accept": boolean
}

Response:
{
  "message": "Invitation accepted/rejected successfully."
}
```

---

## 🔐 Password Vault Endpoints (Requires Authentication)

### 1. Add Credential

**POST** `/api/passwordvault` (Authorized)

```json
Request:
{
  "title": "string (required)",
  "url": "string",
  "username": "string",
  "password": "string (required)",
  "note": "string"
}

Response:
{
  "message": "Credential stored securely."
}
```

### 2. Get My Credentials

**GET** `/api/passwordvault` (Authorized)

```json
Response:
[
  {
    "id": "string (ObjectId)",
    "title": "string",
    "url": "string",
    "username": "string",
    "password": "string (encrypted/decrypted)",
    "note": "string",
    "createdAt": "datetime"
  }
]
```

### 3. Delete Credential

**DELETE** `/api/passwordvault/{id}` (Authorized - Owner only)

```json
Response: 204 No Content
```

---

## 💳 Subscription Plans Endpoints

### 1. Get Active Plans

**GET** `/api/subscriptionplans` (Public)

```json
Response:
[
  {
    "id": "string (ObjectId)",
    "name": "string (Free|Basic|Pro|Enterprise)",
    "title": "string",
    "price": decimal,
    "durationDays": integer,
    "description": "string",
    "isActive": boolean,
    "updatedAt": "datetime"
  }
]
```

### 2. Get All Plans (Admin Only)

**GET** `/api/subscriptionplans/admin/all` (Roles: Admin)

```json
Response: SubscriptionPlan[]
```

### 3. Create Plan (Admin Only)

**POST** `/api/subscriptionplans` (Roles: Admin)

```json
Request:
{
  "name": "string",
  "title": "string",
  "price": decimal,
  "durationDays": integer,
  "description": "string"
}

Response: SubscriptionPlan
```

### 4. Update Plan (Admin Only)

**PUT** `/api/subscriptionplans/{id}` (Roles: Admin)

```json
Request: Same as Create Plan

Response: 204 No Content
```

### 5. Delete Plan (Admin Only)

**DELETE** `/api/subscriptionplans/{id}` (Roles: Admin)

```json
Response: 204 No Content
```

---

## 🔑 Authentication & Authorization

### JWT Token Structure

- Token is returned from login/register endpoints
- Include in all requests: `Authorization: Bearer {token}`
- Token expires after 60 minutes
- Roles: `Member`, `Admin`

### User Roles

- **Member**: Default role, can create projects, tasks, manage own resources
- **Admin**: Can manage all users and subscription plans

### Authorization Rules

- **Project Owner**: Can update, delete projects and assign members
- **Project Member**: Can view project and its tasks
- **Task Owner**: Can update, delete tasks (task creator)
- **Task Assignee**: Can view and manage their assigned tasks
- **Comment Creator**: Can view comments on tasks they have access to

---

## 🔌 Data Models

### User Entity

```
{
  id: string (ObjectId),
  username: string,
  email: string,
  passwordHash: string,
  role: "Member" | "Admin",
  isActive: boolean = true,
  isEmailVerified: boolean = false,
  profile: {
    fullName: string,
    avatarUrl: string,
    bio: string,
    phoneNumber: string,
    jobTitle: string
  },
  subscription: {
    plan: "Free" | "Basic" | "Pro" | "Enterprise",
    status: "Active" | "Inactive",
    startDate: datetime,
    endDate: datetime?,
    isPremium: boolean,
    premiumUntil: datetime?
  },
  settings: {
    theme: "Light" | "Dark",
    language: "en" | "vi" | etc,
    enableNotifications: boolean
  },
  createdAt: datetime,
  updatedAt: datetime?
}
```

### Project Entity

```
{
  id: string (ObjectId),
  name: string,
  description: string,
  status: "Planning" | "Active" | "Completed" | "Archived",
  startDate: datetime?,
  endDate: datetime?,
  ownerId: string (ObjectId),
  members: [
    {
      userId: string (ObjectId),
      projectRole: "Owner" | "Member" | "Viewer"
    }
  ],
  createdAt: datetime,
  updatedAt: datetime?
}
```

### Task Entity

```
{
  id: string (ObjectId),
  title: string,
  description: string,
  status: "Todo" | "InProgress" | "Done" | "Cancelled",
  dueDate: datetime?,
  userId: string (ObjectId - who it's assigned to),
  projectId: string (ObjectId),
  createdAt: datetime,
  updatedAt: datetime?
}
```

### Comment Entity

```
{
  id: string (ObjectId),
  content: string,
  taskId: string (ObjectId),
  userId: string (ObjectId),
  createdAt: datetime
}
```

### Notification Entity

```
{
  id: string (ObjectId),
  userId: string (ObjectId),
  message: string,
  isRead: boolean = false,
  type: "Project" | "Task" | "Deadline",
  referenceId: string (ProjectId or TaskId),
  createdAt: datetime
}
```

### ProjectInvitation Entity

```
{
  id: string (ObjectId),
  projectId: string (ObjectId),
  projectName: string,
  inviterId: string (ObjectId),
  inviterName: string,
  invitedEmail: string,
  status: "Pending" | "Accepted" | "Rejected",
  createdAt: datetime
}
```

### PasswordVaultItem Entity

```
{
  id: string (ObjectId),
  userId: string (ObjectId),
  title: string,
  url: string,
  username: string,
  password: string (encrypted),
  note: string,
  createdAt: datetime
}
```

### SubscriptionPlan Entity

```
{
  id: string (ObjectId),
  name: string,
  title: string,
  price: decimal,
  durationDays: integer,
  description: string,
  isActive: boolean = true,
  updatedAt: datetime
}
```

---

## 🛠️ Key Services

### Authentication Services

- **AuthService**: Handles Google login, generates JWT tokens
- **UserService**: User registration, login, profile management
- **JwtTokenService**: Generates and validates JWT tokens
- **OtpService**: Generates and verifies OTP for registration and password reset

### Core Services

- **ProjectService**: Project CRUD, member management
- **TaskService**: Task CRUD, assignment, status management
- **CommentService**: Comment CRUD on tasks
- **NotificationService**: Notification management
- **ProjectInvitationService**: Project invitation handling

### Additional Services

- **PasswordVaultService**: Secure credential storage (encrypted)
- **SubscriptionPlanService**: Subscription plan management
- **PaymentService**: Payment processing via PayOS
- **EmailService**: Email notifications and OTP sending
- **TaskDeadlineWorker**: Background worker for deadline notifications

---

## 📋 DTO Request/Response Summary

### Auth DTOs

- **RegisterRequest**: username, email, password
- **LoginRequest**: email, password
- **GoogleLoginRequest**: idToken
- **VerifyRegisterRequest**: username, email, password, otpCode
- **VerifyOtpRequest**: email, otpCode
- **ForgotPasswordRequest**: email
- **TokenResponse**: token

### User DTOs

- **UpdateProfileRequest**: fullName?, avatarUrl?, bio?, phoneNumber?, jobTitle?
- **UpdateUserRequest**: email?, role?, isActive?
- **AuthResponse**: id, username, email, subscription, role, token?

### Project DTOs

- **CreateProjectDto**: name, description, startDate?, endDate?
- **UpdateProjectDto**: name?, description?, status?, startDate?, endDate?
- **ProjectResponse**: Full project details including members
- **AddMemberDto**: userId, projectRole

### Task DTOs

- **CreateTaskDto**: title, description?, dueDate?, projectId
- **UpdateTaskDto**: title?, description?, status?, dueDate?
- **TaskResponse**: Full task details
- **AssignTaskDto**: targetUserId

### Comment DTOs

- **CreateCommentDto**: content, taskId
- **CommentResponse**: id, content, taskId, userId, createdAt

### Invitation DTOs

- **InviteRequest**: projectId, invitedEmail
- **RespondInvitationRequest**: accept (boolean)

### Password Vault DTOs

- **AddCredentialDto**: title, url?, username?, password, note?
- **CredentialResponseDto**: id, title, url, username, password, note, createdAt

### Subscription DTOs

- **CreateSubscriptionPlanDto**: name, title, price, durationDays, description

---

## ✨ Key Features

1. **JWT Authentication** - Secure token-based auth with 60-min expiry
2. **Email OTP Verification** - For registration and password recovery
3. **Google OAuth Login** - Social login integration
4. **Project Management** - Create, update, delete projects with member roles
5. **Task Management** - Full CRUD with status tracking and assignments
6. **Comments** - Discussion on tasks
7. **Notifications** - Real-time notifications for project/task events
8. **Project Invitations** - Invite users to projects with accept/reject
9. **Password Vault** - Encrypted credential storage
10. **Subscription Plans** - Multiple tiers (Free, Basic, Pro, Enterprise)
11. **Payment Integration** - PayOS for subscription payments
12. **Admin Panel** - User and plan management (Admin role only)
13. **User Settings** - Theme, language, notification preferences

---

## 🚀 Frontend Development Tips

1. **Store JWT Token**: Store in localStorage or sessionStorage after login
2. **Add Authorization Header**: Include `Authorization: Bearer {token}` in all API calls
3. **Handle Token Expiry**: Redirect to login when receiving 401 Unauthorized
4. **Form Validation**: Match DTOs with form validation rules
5. **Loading States**: Implement loading spinners during API calls
6. **Error Handling**: Display meaningful error messages from API responses
7. **Real-time Updates**: Consider WebSocket for live notifications (future enhancement)
8. **Caching**: Cache project/task data to reduce API calls
9. **Pagination**: Implement for large lists (tasks, projects, users)
10. **Environment Variables**: Store API_BASE_URL in .env file

---

## 📝 Example API Call (JavaScript/React)

```javascript
// Login
const loginResponse = await fetch("http://localhost:8080/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
  }),
});
const { token } = await loginResponse.json();
localStorage.setItem("token", token);

// Get Projects
const projectsResponse = await fetch("http://localhost:8080/api/projects", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  },
});
const projects = await projectsResponse.json();

// Create Task
const taskResponse = await fetch("http://localhost:8080/api/tasks", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "New Task",
    description: "Task description",
    projectId: "project_id_here",
    dueDate: "2024-12-31T23:59:59Z",
  }),
});
const task = await taskResponse.json();
```

---

## 📞 Status Codes Reference

- **200 OK**: Successful GET/PUT request
- **201 Created**: Successful POST request
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Invalid input or validation error
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions (authorization failed)
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side error

---

**Last Updated**: June 5, 2026
**Backend Type**: .NET Core REST API
**Database**: MongoDB
**Authentication**: JWT Bearer Tokens
