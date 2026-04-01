# 📱 Snifr Backend API Documentation

Complete API documentation for the Snifr React Native mobile app authentication backend.

## 🚀 Base URL

```
Development: http://localhost:5000
Production: https://your-production-url.com
```

## 📋 General Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

---

## 🔐 Authentication Endpoints

### 1. Register New User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "+1234567890"
}
```

**Validation Rules:**
- `email`: Valid email format (required)
- `password`: Minimum 6 characters (required)
- `fullName`: Non-empty string (required)
- `phone`: Valid phone format, 8-20 digits with optional + prefix (required)

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "avatar": null,
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

**Error Responses:**
```json
// Email already exists (400)
{
  "success": false,
  "message": "Email already in use",
  "error": "EMAIL_EXISTS"
}

// Validation error (400)
{
  "success": false,
  "message": "Valid email required, Password must be at least 6 characters",
  "error": "VALIDATION_ERROR"
}
```

---

### 2. Login User

**POST** `/api/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "avatar": null,
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

**Error Responses:**
```json
// Invalid credentials (401)
{
  "success": false,
  "message": "Invalid credentials",
  "error": "INVALID_CREDENTIALS"
}
```

---

### 3. Logout User

**POST** `/api/auth/logout`

Logout user and revoke all refresh tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Error Responses:**
```json
// No token provided (401)
{
  "success": false,
  "message": "Not authorized to access this route",
  "error": "NO_TOKEN"
}

// Invalid token (401)
{
  "success": false,
  "message": "Not authorized to access this route",
  "error": "INVALID_TOKEN"
}
```

---

### 4. Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User retrieved",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "avatar": null,
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

---

### 5. Refresh Access Token

**POST** `/api/auth/refresh`

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "newRefreshToken123..."
  }
}
```

**Error Responses:**
```json
// No refresh token (400)
{
  "success": false,
  "message": "Refresh token required",
  "error": "NO_TOKEN"
}

// Invalid token (401)
{
  "success": false,
  "message": "Invalid or expired refresh token",
  "error": "INVALID_TOKEN"
}

// Token expired (401)
{
  "success": false,
  "message": "Refresh token expired",
  "error": "TOKEN_EXPIRED"
}
```

---

## 🔑 Password Reset Endpoints

### 6. Forgot Password

**POST** `/api/auth/forgot-password`

Send a password reset email to the user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reset email sent",
  "data": null
}
```

**Error Responses:**
```json
// User not found (404)
{
  "success": false,
  "message": "There is no user with that email",
  "error": "USER_NOT_FOUND"
}
```

**Note:** For security reasons, the endpoint always returns success even if the email doesn't exist (in production mode).

---

### 7. Reset Password

**POST** `/api/auth/reset-password`

Reset password using the token received via email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

**Error Responses:**
```json
// Invalid or expired token (400)
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}
```

---

## 🔒 Security Features

### Token Expiry
| Token Type | Expiry |
|------------|--------|
| Access Token | 15 minutes |
| Refresh Token | 7 days |
| Password Reset Token | 1 hour |

### Rate Limiting
- **Window:** 15 minutes
- **Max Requests:** 10 requests per IP
- **Applied to:** Register, Login, Forgot Password

### Password Requirements
- Minimum 6 characters
- Hashed with bcrypt (12 salt rounds)

### Phone Validation
- Format: `^\+?[\d\s-]{8,20}$`
- Examples: `+1234567890`, `+1 234 567 8900`, `123-456-7890`

---

## 📦 User Object Structure

```typescript
interface User {
  id: string;              // UUID
  email: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;       // ISO 8601 datetime
  lastLoginAt: string | null; // ISO 8601 datetime
}
```

---

## 🚨 Error Codes Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `EMAIL_EXISTS` | 400 | Email is already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `NO_TOKEN` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "phone": "+1234567890"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 📝 React Native Integration Example

```typescript
// api/auth.ts
const API_BASE_URL = 'http://localhost:5000/api/auth';

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data: LoginResponse = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  // Store tokens securely
  await SecureStore.setItemAsync('accessToken', data.data.token);
  await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
  
  return data.data;
};

export const refreshToken = async (refreshToken: string) => {
  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  // Update stored tokens
  await SecureStore.setItemAsync('accessToken', data.data.token);
  await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
  
  return data.data;
};
```

---

## 🛠 Setup Instructions

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Initialize Database**
   ```bash
   npm run db:init
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

---

## 📞 Support

For issues or questions, contact the backend team.

**Version:** 1.0.0  
**Last Updated:** March 26, 2026
