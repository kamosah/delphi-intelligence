# Authentication Testing Guide

## Setup: Configure Supabase Redirect URLs

**IMPORTANT**: Before testing, configure Supabase Auth redirect URLs:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these redirect URLs:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. Save changes

Without this configuration, email verification will redirect to the wrong page.

---

## Problem: Redirected to Dashboard When Accessing Login/Signup

This happens because the middleware detects the `olympus-auth-token` cookie in your browser, even though the backend sessions have been cleared.

## Solution: Clear Browser State

### Option 1: Clear Cookies and LocalStorage (Recommended)

**In Chrome/Brave/Edge:**

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. Under **Storage** → **Local Storage** → Select your localhost URL
   - Click "Clear All" button
4. Under **Storage** → **Cookies** → Select your localhost URL
   - Delete these cookies:
     - `olympus-auth-token`
     - `olympus-refresh-token`
5. Under **Storage** → **Session Storage** → Select your localhost URL
   - Click "Clear All" button
6. Refresh the page (Cmd+R or Ctrl+R)

**In Firefox:**

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Storage** tab
3. Expand **Local Storage** → Select your localhost URL → Click "Delete All"
4. Expand **Cookies** → Select your localhost URL → Delete auth cookies
5. Refresh the page

### Option 2: Use Incognito/Private Mode

Open your app in an incognito/private window for a clean slate.

### Option 3: Clear All Site Data via Browser Settings

**Chrome/Brave/Edge:**

1. Click the lock/info icon in the address bar
2. Click "Site settings" or "Cookies and site data"
3. Click "Clear data" or "Remove" for all site data
4. Refresh

---

## Testing Checklist

### ✅ Backend Ready

- [x] Redis cleared (all sessions removed)
- [x] Supabase database clean (no test users)
- [x] API server running (port 8000)

### 🔄 Browser Setup Needed

- [ ] Clear `olympus-auth-token` cookie
- [ ] Clear `olympus-refresh-token` cookie
- [ ] Clear localStorage (`olympus-auth-store`)
- [ ] Clear sessionStorage

---

## Step-by-Step Test Plan

### 1. Test Signup Flow

1. Navigate to `http://localhost:3000/signup`
2. Fill in the form:
   - Full name: Test User
   - Email: test@example.com (use a real email you can access for verification)
   - Password: Test1234
   - Confirm password: Test1234
   - Accept terms: checked
3. Click "Create account"
4. **Expected**: Redirect to `/verify-email?email=test@example.com`
5. **Check**: Email verification page shows with resend button

### 2. Test Email Verification

1. Check your email inbox for verification email
2. Click the verification link
3. **Expected**: Redirect to `/auth/confirm?token=...&type=signup`
4. **Expected**: Success message with auto-redirect to dashboard
5. **Check**: Redirects to dashboard after 3 seconds

### 3. Test Login with Unverified Email

1. Create a new account (repeat step 1)
2. Navigate to `http://localhost:3000/login`
3. Try to login WITHOUT clicking verification email
4. **Expected**: Error alert saying "Please verify your email address"
5. **Expected**: "Resend verification email" button appears
6. Click resend button
7. **Expected**: Success message "Verification email sent!"
8. **Check**: Button disabled for 60 seconds

### 4. Test Login with Verified Email

1. Use the account from Test #2 (verified)
2. Navigate to `http://localhost:3000/login`
3. Enter credentials
4. **Expected**: Redirect to `/dashboard`
5. **Check**: No email verification banner on dashboard

### 5. Test Middleware Protection

1. Logout (if logged in)
2. Try to access `http://localhost:3000/dashboard` directly
3. **Expected**: Redirect to `/login?redirect=/dashboard`
4. Login successfully
5. **Expected**: Redirect back to `/dashboard`

### 6. Test Forgot Password Flow

1. Navigate to `http://localhost:3000/forgot-password`
2. Enter email: test@example.com
3. Click "Send reset link"
4. **Expected**: Success screen "Check your email"
5. Check email for password reset link
6. Click the reset link
7. **Expected**: Navigate to `/reset-password?token=...`

### 7. Test Reset Password Flow

1. From the reset password page (step 6)
2. Enter new password: NewTest1234
3. Confirm password: NewTest1234
4. **Expected**: Password strength indicator shows "Strong"
5. Click "Reset password"
6. **Expected**: Success message with countdown
7. **Expected**: Auto-redirect to `/login` after 5 seconds
8. Login with new password
9. **Expected**: Login succeeds

### 8. Test Dashboard Email Banner

1. Create a new unverified account
2. Manually verify the user in Supabase (or use backend to login)
3. Mark email as unverified in database
4. Login to dashboard
5. **Expected**: Yellow banner appears at top
6. **Expected**: Banner shows "Verify your email address"
7. Click "Resend verification email"
8. **Expected**: Success message in banner
9. Click X to dismiss
10. **Expected**: Banner disappears

### 9. Test Logout

1. From dashboard, logout
2. **Expected**: Cookies cleared (`olympus-auth-token`, `olympus-refresh-token`)
3. **Expected**: LocalStorage cleared (`olympus-auth-store`)
4. Try to access `/dashboard`
5. **Expected**: Redirect to `/login`

---

## Current Issue: Why Login/Signup Redirects to Dashboard

The middleware (`apps/web/src/middleware.ts`) checks for the `olympus-auth-token` cookie:

```typescript
const authToken = request.cookies.get('olympus-auth-token');
const isAuthenticated = !!authToken?.value;

// Redirect to dashboard if accessing auth routes while authenticated
if (isAuthRoute && isAuthenticated) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

Even though Redis is cleared, your browser still has the cookie, so middleware thinks you're authenticated.

**Solution**: Clear the cookies as described above!

---

## Troubleshooting

### Issue: "Failed to fetch" or Network Error

- Check API is running: `curl http://localhost:8000/health`
- Check frontend is running: Visit `http://localhost:3000`
- Check CORS settings in backend

### Issue: Email Not Received

- Check Supabase email settings (may be disabled in development)
- Check spam folder
- Use Supabase dashboard to manually confirm emails
- Check API logs: `docker compose logs -f api`

### Issue: Token Expired

- Clear browser state and start fresh
- Check Redis is running: `docker exec athena_redis_1 redis-cli PING`
- Should return: `PONG`

### Issue: Middleware Not Working

- Check middleware config in `apps/web/src/middleware.ts`
- Check cookie names match: `olympus-auth-token` (not `auth-token`)
- Clear Next.js cache: `rm -rf apps/web/.next`
- Restart dev server: `npm run dev`

---

## Quick Commands

### Backend

```bash
# Check services
cd apps/api && docker compose ps

# View API logs
docker compose logs -f api

# Clear Redis
docker exec athena_redis_1 redis-cli FLUSHALL

# Restart services
docker compose restart
```

### Frontend

```bash
# Start dev server
cd apps/web && npm run dev

# Clear Next.js cache
rm -rf .next

# Type check
npm run type-check
```

### Database

```bash
# Check users in Supabase
# Use Supabase MCP or dashboard
```

---

## Expected Auth Flow Diagram

```
┌─────────────┐
│   Signup    │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Verify Email    │ ◄─── Resend button (60s cooldown)
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ Email Confirmed │
└──────┬──────────┘
       │
       v
┌─────────────────┐
│     Login       │ ◄─── Blocks if unverified
└──────┬──────────┘
       │
       v
┌─────────────────┐
│   Dashboard     │ ◄─── Protected by middleware
└─────────────────┘
       │
       v
┌─────────────────┐
│     Logout      │
└─────────────────┘
```

---

## Next Steps

1. **Clear browser state** (cookies + localStorage)
2. **Verify you can access** `http://localhost:3000/login` without redirect
3. **Follow the test plan above** step by step
4. **Report any issues** with specific error messages

Good luck testing! 🚀
