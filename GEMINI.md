# Snifr Backend - Gemini Context

This file provides essential context for Gemini CLI when working on the Snifr Backend project.

## Project Overview

**Snifr** is a "Tinder for dogs" React Native application. This repository contains the backend services that power the mobile app.

### Core Technologies
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (hosted on Neon DB)
- **Real-time:** Socket.io for chat and notifications
- **Authentication:** JWT (Access & Refresh tokens) with bcryptjs for hashing
- **Storage:** Cloudinary for pet and user image uploads
- **Email:** Nodemailer for OTP and password resets

### Architecture
The project follows a modular structure:
- `src/server.ts`: Entry point, initializes HTTP server and Socket.io.
- `src/app.ts`: Express application setup, global middleware, and route mounting.
- `src/routes/`: Route definitions with `express-validator` logic.
- `src/controllers/`: Request handling and business logic orchestration.
- `src/repositories/`: Database abstraction layer using `pg` (PostgreSQL) pool.
- `src/middleware/`: Authentication, rate limiting, and validation logic.
- `src/config/`: Configuration for DB, Sockets, and Cloudinary.
- `database/`: SQL scripts for schema definition and migrations.
- `scripts/`: Utility scripts for maintenance, testing, and data seeding.

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database (or Neon DB connection string)
- Cloudinary account (for image uploads)
- SMTP server (optional, for email features)

### Commands
- **Install Dependencies:** `npm install`
- **Development Mode:** `npm run dev` (starts `nodemon server.js`)
- **Production Mode:** `npm start`
- **Database Setup:** `npm run db:setup` (runs `scripts/setup-db.js`)
- **Run Scripts:** Use `npx ts-node scripts/<script-name>.ts`

### Environment Variables
Ensure a `.env` file exists with the following (see `.env.example`):
- `PORT`: Server port (default 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials

## Development Conventions

### 1. Database Access
Always use the Repository pattern found in `src/repositories/`. Avoid direct `pool.query` calls in controllers.

### 2. Authentication
- Protected routes use the `protect` middleware from `src/middleware/auth.middleware.ts`.
- The `req.user` object is populated for authenticated requests.

### 3. Response Formatting
Use the utility functions in `src/utils/response.ts` (`sendSuccess`, `sendError`) to maintain a consistent API response structure.

### 4. Real-time Communication
- Socket.io logic is centralized in `src/config/socket.ts`.
- Rooms are named following the pattern `match_{matchId}`.
- Authentication for sockets is handled via handshake tokens.

### 5. Validation
Every route that accepts user input should have a corresponding `express-validator` ruleset and use the `validate` middleware.

### 6. Code Style
- Use TypeScript interfaces/types for all data structures.
- Prefer `async/await` over raw promises or callbacks.
- Log significant errors using `console.error` for debugging.

## Key Files & Directories
- `src/db/schema.sql`: Source of truth for the database schema.
- `docs/`: Contains API documentation and setup guides.
- `src/middleware/rateLimiter.ts`: Controls API rate limits, especially for auth endpoints.
