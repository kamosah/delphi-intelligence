# Authentication System Setup Guide

## Overview

The Olympus MVP API now includes a comprehensive authentication system that integrates:

- **Supabase Auth** for user management and authentication
- **JWT tokens** for session management and API authorization
- **Redis** for session storage and token blacklisting
- **FastAPI middleware** for request authentication

## Features

### Core Authentication Features

- ✅ User registration with email and password
- ✅ User login with JWT token generation
- ✅ Token refresh mechanism
- ✅ Session management with Redis
- ✅ Token blacklisting for secure logout
- ✅ Password reset flow (placeholder endpoints)
- ✅ Email verification flow (placeholder endpoints)
- ✅ Role-based access control
- ✅ Middleware for automatic authentication

### Security Features

- ✅ JWT tokens with configurable expiration
- ✅ Refresh tokens with longer lifetime
- ✅ Redis-based session storage
- ✅ Token blacklisting on logout
- ✅ CORS protection
- ✅ Request validation with Pydantic

## Quick Start

### 1. Environment Setup

Copy the environment template:

```bash
cp .env.example .env
```

Update the required variables in `.env`:

```bash
# Supabase Configuration (required)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (required - change this!)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Redis (required)
REDIS_URL=redis://localhost:6379
```

### 2. Start Required Services

Start Redis and PostgreSQL:

```bash
docker compose up -d redis postgres
```

### 3. Install Dependencies

```bash
poetry install
```

### 4. Run the Application

```bash
poetry run uvicorn app.main:app --reload
```

### 5. Test the Authentication

The API will be available at `http://localhost:8000` with the following endpoints:

## API Endpoints

### Authentication Endpoints

| Method | Endpoint                     | Description               | Auth Required |
| ------ | ---------------------------- | ------------------------- | ------------- |
| POST   | `/auth/register`             | Register new user         | No            |
| POST   | `/auth/login`                | Login user                | No            |
| POST   | `/auth/refresh`              | Refresh access token      | No            |
| POST   | `/auth/logout`               | Logout user               | Yes           |
| GET    | `/auth/me`                   | Get current user profile  | Yes           |
| POST   | `/auth/forgot-password`      | Request password reset    | No            |
| GET    | `/auth/verify-email/{token}` | Verify email address      | No            |
| POST   | `/auth/resend-verification`  | Resend verification email | Yes           |

### Example Usage

#### Register a new user:

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'
```

#### Login:

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### Access protected endpoints:

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Architecture

### JWT Token Flow

1. User logs in with email/password
2. Supabase validates credentials
3. API generates custom JWT access + refresh tokens
4. Tokens stored in Redis for session management
5. Client includes access token in Authorization header
6. Middleware validates token on each request

### Token Structure

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "member",
  "supabase_token": "supabase-session-token",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Middleware Authentication

The `AuthenticationMiddleware` automatically:

- Extracts JWT tokens from Authorization headers
- Validates tokens and checks blacklist
- Adds user context to request.state
- Allows routes to require authentication via dependencies

### Protected Routes

Use authentication dependencies to protect routes:

```python
from app.auth.dependencies import get_current_user, require_admin

@router.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_user)):
    return {"message": "Hello authenticated user", "user": current_user}

@router.get("/admin-only")
async def admin_route(current_user: dict = Depends(require_admin)):
    return {"message": "Admin access granted"}
```

## Configuration

### JWT Settings

- `JWT_SECRET`: Secret key for signing tokens (change in production!)
- `JWT_ALGORITHM`: Algorithm for token signing (default: HS256)
- `JWT_EXPIRATION_HOURS`: Access token lifetime (default: 24 hours)

### Session Settings

- `REDIS_URL`: Redis connection URL for session storage
- `SESSION_TIMEOUT_HOURS`: How long sessions persist (default: 24 hours)
- `REFRESH_TOKEN_LIFETIME_DAYS`: Refresh token lifetime (default: 30 days)

### Supabase Settings

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Public anon key for client operations
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

## Testing

Run the authentication tests:

```bash
# JWT token tests
poetry run pytest tests/test_auth_jwt.py -v

# Redis session tests
poetry run pytest tests/test_auth_redis.py -v

# API route tests
poetry run pytest tests/test_auth_routes.py -v

# All auth tests
poetry run pytest tests/test_auth* -v
```

## Security Considerations

### Production Deployment

- [ ] Change `JWT_SECRET` to a cryptographically secure random key
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up SSL for Redis connection
- [ ] Use environment-specific Supabase projects
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring and alerting

### Token Security

- Access tokens expire after 24 hours (configurable)
- Refresh tokens expire after 30 days (configurable)
- Tokens are blacklisted on logout
- Redis stores session data with automatic expiration

### Database Security

- Supabase RLS policies protect user data
- Service role bypasses RLS for admin operations
- User client respects RLS for regular operations

## Troubleshooting

### Common Issues

1. **Redis connection errors**: Ensure Redis is running (`docker compose up -d redis`)
2. **Supabase auth errors**: Check your Supabase keys and URL
3. **JWT errors**: Verify JWT_SECRET is set and consistent
4. **Import errors**: Run `poetry install` to install dependencies

### Debug Mode

Set `DEBUG=true` in `.env` to enable:

- Detailed error messages
- API documentation at `/docs`
- GraphQL playground at `/graphql`

## Next Steps

- [ ] Implement email verification flow
- [ ] Add password reset functionality
- [ ] Set up rate limiting
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Implement user profile management
- [ ] Add audit logging for auth events
