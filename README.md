# Snifr Backend

This is the Node.js + Express.js authentication backend for the Snifr React Native app.

## Features
- **MongoDB** integration with Mongoose
- **JWT** Authentication for stateless sessions
- **bcryptjs** for secure password hashing
- **express-validator** for request payload validation
- **CORS** enabled for React Native / Web clients

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory (you can copy `.env.example`):
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/snifr
   JWT_SECRET=your_super_secret_key_here
   JWT_EXPIRES_IN=7d
   ```
   *Make sure you have MongoDB running locally or use a MongoDB Atlas URI.*

3. **Start the server**
   ```bash
   # Development mode (auto-reloads on changes)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### 1. Health Check
- **GET** `/`
- Returns: `{ "success": true, "message": "🚀 Snifr API is running!" }`

### 2. Sign Up
- **POST** `/api/auth/signup`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (201 Created):** Contains JWT `token` and `user` object.

### 3. Log In
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):** Contains JWT `token` and `user` object.
"# snifr-backend" 
