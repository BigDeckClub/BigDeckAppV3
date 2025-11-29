# Authentication Configuration

This application uses Auth.js (formerly NextAuth.js) for authentication with multiple OAuth providers and email/password support.

## Environment Variables

The following environment variables must be configured for authentication to work:

### Required Core Variables

```bash
# Auth.js secret key for signing tokens/cookies (generate a strong random string)
AUTH_SECRET=your-auth-secret-key

# Session secret for Express sessions (can be the same as AUTH_SECRET)
SESSION_SECRET=your-session-secret-key

# PostgreSQL database connection string
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Google OAuth

To enable Google sign-in:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Configure the consent screen
6. Set the authorized redirect URI to: `https://yourdomain.com/api/auth/callback/google`

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Apple OAuth

To enable Apple sign-in:

1. Go to the [Apple Developer Portal](https://developer.apple.com/)
2. Register your app and enable Sign In with Apple
3. Create a Services ID for your web app
4. Generate a client secret (requires a private key)
5. Set the return URL to: `https://yourdomain.com/api/auth/callback/apple`

```bash
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
```

### Facebook OAuth

To enable Facebook sign-in:

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add Facebook Login product
4. Configure OAuth settings
5. Set the Valid OAuth Redirect URI to: `https://yourdomain.com/api/auth/callback/facebook`

```bash
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

### Optional Variables

```bash
# Base URL for Auth.js (auto-detected in most cases)
AUTH_URL=https://yourdomain.com

# Node environment (affects cookie security settings)
NODE_ENV=production
```

## Example .env File

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bigdeck

# Auth.js Configuration
AUTH_SECRET=generate-a-random-32-character-string
SESSION_SECRET=another-random-32-character-string

# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx

# Apple OAuth
APPLE_CLIENT_ID=com.yourdomain.bigdeck
APPLE_CLIENT_SECRET=eyJraWQiOiJ...

# Facebook OAuth
FACEBOOK_CLIENT_ID=1234567890123456
FACEBOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Environment
NODE_ENV=production
```

## Generating Secrets

You can generate secure random secrets using:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Database Tables

Auth.js will create the following tables automatically:

- `auth_users` - User accounts
- `accounts` - OAuth provider accounts linked to users
- `auth_sessions` - User sessions
- `verification_token` - Email verification tokens

The existing `users` table is maintained for backward compatibility and is synced when users sign in.

## Authentication Endpoints

- `GET /api/auth/signin` - Sign in page (handled by Auth.js)
- `GET /api/auth/signin/:provider` - Sign in with specific provider
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session
- `GET /api/auth/user` - Get current user (custom endpoint for compatibility)
- `POST /api/auth/register` - Register new user with email/password

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri"**: Make sure your OAuth callback URLs match exactly what's configured in the provider's developer console.

2. **"Session not found"**: Check that your `AUTH_SECRET` is set correctly and hasn't changed between deployments.

3. **"Database connection failed"**: Verify your `DATABASE_URL` is correct and the database is accessible.

4. **Cookies not working**: In production, ensure `NODE_ENV=production` is set for secure cookie settings.
