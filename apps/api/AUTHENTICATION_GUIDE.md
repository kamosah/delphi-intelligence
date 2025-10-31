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

## Using Authentication in Development Tools

### Swagger UI (/docs)

The Swagger UI provides built-in support for Bearer token authentication:

1. **Login to get tokens**:
   ```bash
   curl -X POST "http://localhost:8000/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "securepassword123"
     }'
   ```

2. **Copy the `access_token` from the response**

3. **In Swagger UI** (`http://localhost:8000/docs`):
   - Click the **"Authorize"** button (🔒 icon) at the top right
   - Enter your token in the format: `Bearer YOUR_ACCESS_TOKEN`
   - Or just paste `YOUR_ACCESS_TOKEN` (Swagger adds "Bearer" automatically)
   - Click **"Authorize"**
   - Click **"Close"**

4. **All subsequent requests** in Swagger UI will now include the Authorization header automatically

5. **To logout**: Click "Authorize" again and click "Logout"

### GraphiQL Interface (/graphql)

GraphiQL requires manual header configuration:

1. **Login to get tokens** (same as above):
   ```bash
   curl -X POST "http://localhost:8000/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "securepassword123"
     }'
   ```

2. **Copy the `access_token` from the response**

3. **In GraphiQL** (`http://localhost:8000/graphql`):
   - Click the **"Headers"** button at the bottom left (below the query editor)
   - Add the Authorization header in JSON format:
     ```json
     {
       "Authorization": "Bearer YOUR_ACCESS_TOKEN"
     }
     ```

4. **Test authentication** with this query:
   ```graphql
   query {
     me {
       id
       email
       fullName
       role
     }
   }
   ```

5. **All subsequent GraphQL queries** will use this header until you clear it or refresh the page

### Quick Test Script

Create a test user and login in one go:

```bash
# Register user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User"
  }'

# Login and extract token (requires jq)
TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }' | jq -r '.access_token')

echo "Your access token:"
echo $TOKEN

# Test authenticated endpoint
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### Important Notes

- **Debug mode required**: Both `/docs` and `/graphql` are only available when `DEBUG=true` in your `.env` file
- **Token expiration**: Access tokens expire after 24 hours (configurable via `JWT_EXPIRATION_HOURS`)
- **Token refresh**: Use the `/auth/refresh` endpoint with your `refresh_token` to get a new access token
- **Security**: The middleware automatically validates tokens and checks the Redis blacklist for revoked tokens

### Troubleshooting Authentication in Dev Tools

**"Unauthorized" errors in Swagger/GraphiQL**:
- Verify your token hasn't expired (check response from `/auth/login` for `expires_in`)
- Ensure the token format is correct: `Bearer YOUR_TOKEN`
- Check Redis is running: `docker compose ps` (must show redis as "Up")
- Verify JWT_SECRET matches between token creation and verification

**"Token has been revoked" errors**:
- The token was blacklisted after logout
- Login again to get a fresh token

**"User not found" errors**:
- The user was deleted from the database
- Register a new user or restore the deleted user

## Next Steps

- [ ] Implement email verification flow
- [ ] Add password reset functionality
- [ ] Set up rate limiting
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Implement user profile management
- [ ] Add audit logging for auth events
