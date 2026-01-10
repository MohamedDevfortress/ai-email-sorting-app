# AI Email Sorter

An AI-powered email management application that automatically categorizes and summarizes your emails using OpenAI.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with your Google account
- 📧 **Automatic Email Categorization** - AI categorizes emails based on custom categories
- 📝 **Email Summarization** - Get concise AI-generated summaries of each email
- 🗂️ **Custom Categories** - Define your own categories with descriptions
- 📥 **Auto-Archive** - Emails are automatically archived in Gmail after processing
- 🔔 **Real-time Processing** - Uses Google Pub/Sub for instant email processing
- 🎨 **Modern UI** - Beautiful interface built with Next.js and Shadcn UI

## Architecture

### Backend (NestJS)
- **Auth Module**: Google OAuth with Passport and JWT
- **Users Module**: User management and profile storage
- **Categories Module**: CRUD operations for email categories
- **Gmail Module**: Gmail API integration (watch, history, messages)
- **AI Module**: OpenAI integration for categorization and summarization
- **Webhook Module**: Google Pub/Sub webhook handler
- **Email Processing Queue**: Bull queue with Redis for background processing

### Frontend (Next.js)
- **Login Page**: Google OAuth flow
- **Dashboard**: Category management and email viewing
- **Responsive Design**: Works on desktop and mobile

### Database
- **PostgreSQL**: User data, categories, and processed emails
- **Redis**: Job queue for email processing

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Google Cloud Project with:
  - Gmail API enabled
  - Pub/Sub API enabled
  - OAuth 2.0 credentials
  - Pub/Sub topic and push subscription
- OpenAI API key

## Setup Instructions

### 1. Clone and Install

```bash
cd ai-email-sorter

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Docker Services

```bash
# From the ai-email-sorter directory
docker-compose up -d
```

This starts PostgreSQL (port 54321) and Redis (port 63791).

### 3. Configure Backend Environment

Create `backend/.env`:

```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=54321
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=email_sorter

REDIS_HOST=localhost
REDIS_PORT=63791

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

OPENAI_API_KEY=your_openai_api_key
GMAIL_TOPIC_NAME=projects/your-project-id/topics/email-notifications

CLIENT_URL=http://localhost:3001
JWT_SECRET=your_jwt_secret_key
```

### 4. Configure Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5. Google Cloud Setup

#### OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API and Pub/Sub API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Add test user: `webshookeng@gmail.com`
7. Copy Client ID and Client Secret to backend `.env`

#### Pub/Sub Setup
1. Go to Pub/Sub in Google Cloud Console
2. Create a topic: `email-notifications`
3. Create a push subscription:
   - Endpoint URL: `http://your-deployed-backend-url/webhook/gmail`
   - For local dev, use [ngrok](https://ngrok.com/): `ngrok http 3000`
4. Copy the topic name to backend `.env` as `GMAIL_TOPIC_NAME`

### 6. Run the Application

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3001
- Backend: http://localhost:3000

### 7. Initialize Gmail Watch

After logging in, the backend needs to set up a watch on the user's inbox. You can create an endpoint or manually trigger this:

```typescript
// Call POST /api/setup-watch after user logs in
// This should be done automatically in production
```

## Usage

1. **Sign In**: Click "Sign in with Google" on the homepage
2. **Create Categories**: Add categories with descriptive names and descriptions
3. **Automatic Processing**: New emails will be automatically:
   - Categorized based on AI analysis
   - Summarized with AI
   - Archived in Gmail
   - Displayed in the dashboard
4. **View Emails**: Click on a category to see all emails sorted into it

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback

### Categories
- `GET /categories` - List user's categories
- `POST /categories` - Create new category
- `GET /categories/:id` - Get category details
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### Emails
- `GET /emails` - List user's emails
- `GET /emails/:id` - Get email details

### Webhook
- `POST /webhook/gmail` - Receive Gmail push notifications

## Deployment

### Backend Deployment (Render/Fly.io)

1. Build the application:
```bash
cd backend
npm run build
```

2. Set environment variables on your hosting platform

3. Update `GOOGLE_CALLBACK_URL` to your production URL

4. Update Pub/Sub subscription endpoint to production URL

### Frontend Deployment (Vercel/Netlify)

1. Build the application:
```bash
cd frontend
npm run build
```

2. Set `NEXT_PUBLIC_API_URL` to your backend URL

3. Deploy to your preferred platform

## Development Notes

- The backend uses TypeORM with `synchronize: true` for development. **Disable this in production!**
- Gmail watch expires after 7 days - implement a cron job to renew
- For production, implement proper error handling and logging
- Consider rate limiting for API endpoints
- Add refresh token rotation for better security

## Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## Troubleshooting

### Port Conflicts
If you encounter port conflicts, the docker-compose.yml uses non-standard ports:
- PostgreSQL: 54321 (instead of 5432)
- Redis: 63791 (instead of 6379)

### OAuth Issues
- Ensure test user is added in Google Cloud Console
- Check redirect URI matches exactly
- Verify scopes are correct in GoogleStrategy

### Pub/Sub Not Working
- Check ngrok is running for local development
- Verify subscription endpoint URL is correct
- Check Google Cloud logs for delivery failures

## License

MIT

## Contributing

This is a challenge submission project. For production use, please add proper error handling, tests, and security measures.
