# Docker Deployment on Render

This guide explains how to deploy the AI Email Sorter backend using Docker on Render.

## Why Docker?

The standard Node.js build on Render fails to install Playwright's system dependencies. Using Docker with a pre-built Playwright image solves this issue.

## Files Created

- `Dockerfile` - Docker configuration using Playwright base image
- `.dockerignore` - Excludes unnecessary files from build

## Render Configuration

### 1. Service Type
- Select **Web Service**
- Environment: **Docker**

### 2. Build Settings

**Build Command:**
```
(leave empty - Docker handles the build)
```

**Start Command:**
```
(leave empty - uses CMD from Dockerfile)
```

### 3. Environment Variables

Add these environment variables in Render dashboard:

```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=<your-postgres-connection-string>

# Redis
REDIS_URL=<your-redis-url>

# JWT
JWT_SECRET=<generate-a-random-secret>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/google/callback

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.onrender.com
```

### 4. Health Check (Optional)

- **Health Check Path:** `/`
- **Grace Period:** 60 seconds

## Deployment Steps

1. **Push to Git:**
   ```bash
   git add backend/Dockerfile backend/.dockerignore
   git commit -m "Add Docker configuration for Render deployment"
   git push
   ```

2. **Create Render Service:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New +** → **Web Service**
   - Connect your repository
   - Select the backend directory (`backend`)
   - Choose **Docker** as environment
   - Set service name (e.g., `ai-email-sorter-backend`)

3. **Configure Environment:**
   - Add all environment variables listed above
   - Set plan (Free tier works for testing)

4. **Deploy:**
   - Click **Create Web Service**
   - Wait for build to complete (~5-10 minutes)

## Dockerfile Explained

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy
```
- Uses official Playwright image (Ubuntu Jammy)
- Includes Chromium + all system dependencies pre-installed
- No need for manual browser installation

```dockerfile
RUN npm ci --only=production
```
- Installs only production dependencies
- Faster and smaller image

```dockerfile
CMD ["npm", "run", "start:prod"]
```
- Runs the built application in production mode

## Testing Locally

Test the Docker build locally before deploying:

```bash
cd backend

# Build the image
docker build -t ai-email-sorter-backend .

# Run the container
docker run -p 3000:3000 --env-file .env ai-email-sorter-backend

# Test the API
curl http://localhost:3000
```

## Troubleshooting

### Build Fails
- Check Docker logs in Render dashboard
- Ensure all files are committed to Git
- Verify Dockerfile syntax

### App Crashes on Start
- Check environment variables are set correctly
- Verify DATABASE_URL and REDIS_URL are accessible
- Check application logs in Render dashboard

### Playwright Issues
- The Playwright base image includes Chromium by default
- No additional installation needed
- Runs in headless mode automatically

## Cost Considerations

- **Docker builds** take longer than standard Node builds
- **Image size** is larger (~1.5GB vs ~200MB)
- **Free tier** works but may have cold starts
- Consider **Starter plan** for production ($7/month)

## Next Steps

After successful deployment:
1. Update frontend `NEXT_PUBLIC_API_URL` to backend URL
2. Update Google OAuth callback URL
3. Test the unsubscribe automation feature
4. Monitor logs for any errors
