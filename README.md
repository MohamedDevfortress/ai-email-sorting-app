# AI Email Sorter

An intelligent email management application that uses AI to automatically categorize and summarize your Gmail emails.

<img width="1440" height="837" alt="image" src="https://github.com/user-attachments/assets/82d082b8-8026-4af6-9e9a-9ababb3bb1a3" />

<img width="1440" height="837" alt="image" src="https://github.com/user-attachments/assets/a7b5b7df-7b83-4751-b8e3-0899183b6a2a" />

<img width="1438" height="797" alt="image" src="https://github.com/user-attachments/assets/68d79c1e-33c6-47c2-a762-685df47b127b" />




## Features

- 🤖 **AI-Powered Categorization**: Automatically sorts emails into custom categories using OpenAI
- 📝 **Smart Summaries**: Get AI-generated summaries of your emails
- 📧 **Multi-Account Support**: Manage multiple Gmail accounts in one dashboard
- 🔄 **Real-time Processing**: Webhook-based email processing with Gmail API
- 🗑️ **Bulk Actions**: Select and delete multiple emails at once
- 👁️ **Email Detail View**: Read original email content in a modal
- 🔐 **Secure Authentication**: Google OAuth 2.0 with JWT tokens

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Database
- **Bull** - Queue management for email processing
- **Redis** - Queue storage
- **OpenAI API** - Email categorization and summarization
- **Gmail API** - Email fetching and management
- **Passport.js** - Authentication

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - UI components

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Google Cloud Project with Gmail API enabled
- OpenAI API key

## Environment Setup

### Backend (.env)

Create `backend/.env`:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ai_email_sorter

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Gmail API
GMAIL_TOPIC_NAME=projects/your-project-id/topics/email-notifications

# JWT
JWT_SECRET=your_jwt_secret_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=5000
CLIENT_URL=http://localhost:3001
```

### Frontend (.env)

Create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Google Cloud Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Gmail API

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in app information
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.labels`

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
5. Save the Client ID and Client Secret

### 4. Set Up Pub/Sub for Gmail Webhooks

1. Go to **Pub/Sub** → **Topics**
2. Create a new topic (e.g., `email-notifications`)
3. Click on the topic → **PERMISSIONS**
4. Click **GRANT ACCESS**
5. Add principal: `gmail-api-push@system.gserviceaccount.com`
6. Assign role: **Pub/Sub Publisher**
7. Copy the full topic name (format: `projects/PROJECT_ID/topics/TOPIC_NAME`)

## Installation

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Installation

#### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### 2. Start Services

```bash
# Start PostgreSQL and Redis (if not using Docker)
# Using Homebrew on macOS:
brew services start postgresql
brew services start redis

# Or use Docker for just the databases:
docker-compose up -d postgres redis
```

#### 3. Run Applications

```bash
# Backend (runs on port 5000)
cd backend
npm run start:dev

# Frontend (runs on port 3001)
cd frontend
npm run dev
```

## Usage

### 1. Sign In

1. Navigate to `http://localhost:3001`
2. Click **Sign in with Google**
3. Authorize the application

### 2. Create Categories

1. Go to the dashboard
2. Click the **+** button in the Categories section
3. Enter category name and description
4. The AI will use these descriptions to categorize emails

### 3. Add Multiple Accounts

1. Click **Add Account** in the Connected Accounts section
2. Select a different Gmail account
3. Switch between accounts using the account switcher

### 4. Manage Emails

- **View emails** by clicking on a category
- **Read original content** by clicking on an email
- **Select emails** using checkboxes
- **Bulk delete** selected emails
- **Select all** emails in a category

## Gmail Watch Setup

The application automatically sets up Gmail watch when you log in. The watch:
- Monitors your inbox for new emails
- Expires after 7 days
- Is automatically renewed on each login

**Note**: For local development, you'll need to expose your webhook endpoint using a tool like [ngrok](https://ngrok.com/).

## Project Structure

```
ai-email-sorter/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Google OAuth & JWT
│   │   ├── users/          # User management
│   │   ├── categories/     # Email categories
│   │   ├── emails/         # Email management
│   │   ├── gmail/          # Gmail API integration
│   │   ├── ai/             # OpenAI integration
│   │   └── webhook/        # Gmail webhook processing
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages
│   │   └── components/    # React components
│   └── package.json
└── docker-compose.yml     # Docker services
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback

### Users
- `GET /users/connected-accounts` - List connected accounts
- `POST /users/switch-account/:userId` - Switch to another account
- `DELETE /users/connected-accounts/:id` - Remove account

### Categories
- `GET /categories` - List categories
- `POST /categories` - Create category
- `DELETE /categories/:id` - Delete category

### Emails
- `GET /emails` - List emails
- `GET /emails/:id/original` - Get original email content
- `DELETE /emails/bulk` - Bulk delete emails

## Troubleshooting

### OAuth Errors

**Error**: `redirect_uri_mismatch`
- Ensure `GOOGLE_CALLBACK_URL` matches the authorized redirect URI in Google Cloud Console
- Check that the port is correct (5000 for backend)

### Token Expired

**Error**: `401 Unauthorized` when fetching emails
- Log out and log back in to refresh OAuth tokens
- Tokens expire after ~1 hour but are automatically refreshed

### Gmail Watch Not Working

- Ensure Pub/Sub topic is created and permissions are granted
- Check that `GMAIL_TOPIC_NAME` is correct in `.env`
- For local development, use ngrok to expose the webhook endpoint

## Development

### Running Tests

```bash
# Backend
cd backend
npm run test

# Frontend
cd frontend
npm run test
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes using conventional commits
4. Push to your fork
5. Create a Pull Request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
