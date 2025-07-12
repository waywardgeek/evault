# eVault Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL installed (for local development)
- Vercel account (for deployment)

## Local Development Setup

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Set Up Local Database
```bash
# Run the setup script (Linux/macOS)
./setup-local-db.sh

# Or manually create a PostgreSQL database and update .env.local
```

### 3. Configure Environment Variables
Update `.env.local` with your OAuth credentials:
- Google OAuth: Get from [Google Cloud Console](https://console.cloud.google.com)
- Apple OAuth: Get from [Apple Developer Portal](https://developer.apple.com)

### 4. Initialize Database
```bash
npx prisma db push
```

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Testing API Routes

### Option 1: Use the Test Script
```bash
npx tsx test-api-routes.ts
```

### Option 2: Use Prisma Studio
```bash
npx prisma studio
```

## Production Deployment

### 1. Create Vercel Project
```bash
vercel
```

### 2. Add Vercel Postgres
1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → Postgres
3. Connect to your project

### 3. Set Environment Variables
In Vercel dashboard, add:
- `JWT_SECRET` - Generate a secure random string
- All OAuth credentials from `.env.local`

### 4. Deploy
```bash
vercel --prod
```

## Common Commands

```bash
# Database
npx prisma db push      # Push schema to database
npx prisma studio       # Open database GUI
npx prisma generate     # Generate Prisma Client

# Development
npm run dev            # Start dev server
npm run build          # Build for production
npm run lint           # Run linter

# Testing
npx tsx test-api-routes.ts  # Test API endpoints
```

## Architecture Overview

```
client/
├── src/
│   ├── app/
│   │   ├── api/          # API routes (replaces Go server)
│   │   │   ├── auth/     # Authentication endpoints
│   │   │   ├── user/     # User management
│   │   │   ├── vault/    # Vault operations
│   │   │   └── entries/  # Password entries
│   │   └── (pages)/      # Next.js pages
│   └── lib/
│       ├── db.ts         # Database operations
│       ├── jwt.ts        # JWT handling
│       └── auth-middleware.ts  # Auth middleware
└── prisma/
    └── schema.prisma     # Database schema
```

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `sudo service postgresql status`
- Verify connection string in `.env.local`
- Ensure database exists: `psql -U postgres -l`

### OAuth Not Working
- Verify redirect URLs in OAuth provider settings
- Check environment variables are set correctly
- Ensure `NEXTAUTH_URL` matches your domain

### API Routes 404
- Ensure you're running `npm run dev`
- Check route file naming (must be `route.ts`)
- Verify middleware isn't blocking requests 