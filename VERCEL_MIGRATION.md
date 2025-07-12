# Migration Guide: Google Cloud to Vercel

## Overview

This guide walks through migrating eVault from Google Cloud (Cloud Run + Cloud SQL) to a Vercel-only solution.

## What's Changed

### Before (Google Cloud Architecture)
- **Frontend**: Next.js on Vercel
- **Backend**: Go server on Cloud Run
- **Database**: PostgreSQL on Cloud SQL
- **Complexity**: 2 separate deployments, 2 languages, Docker builds

### After (Vercel-Only Architecture)
- **Frontend**: Next.js on Vercel
- **Backend**: Next.js API Routes on Vercel
- **Database**: Vercel Postgres (powered by Neon)
- **Simplicity**: 1 deployment, 1 language (TypeScript), no Docker

## Migration Steps

### 1. Set Up Vercel Postgres

1. Go to your Vercel dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → Select "Postgres"
4. Choose your plan (Hobby is fine for starting)
5. Connect it to your project

Vercel will automatically add these environment variables:
- `POSTGRES_PRISMA_URL` (for connection pooling)
- `POSTGRES_URL_NON_POOLING` (for migrations)

### 2. Run Database Migration

```bash
cd client

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: If you have existing data to migrate
npx prisma db seed
```

### 3. Add Additional Environment Variables

In your Vercel project settings, add:

```
JWT_SECRET=<generate-a-secure-random-string>
```

### 4. Deploy to Vercel

```bash
# Commit all changes
git add .
git commit -m "Migrate from Google Cloud to Vercel"

# Push to trigger deployment
git push
```

### 5. Update Frontend Configuration

The API client has been updated to use `/api` instead of the external Go server URL. No additional changes needed.

### 6. Verify Everything Works

1. Test authentication (Google & Apple Sign In)
2. Test vault operations (register, recover)
3. Test entry operations (add, list, delete)
4. Check user account management

## Benefits of This Migration

### 1. **Cost Savings**
- No Cloud Run costs
- No Cloud SQL costs (~$10-15/month minimum)
- No cross-cloud egress fees
- Vercel Postgres starts at $15/month

### 2. **Performance**
- API and database in same network (lower latency)
- No cold starts (unlike Cloud Run)
- Edge functions available
- Better caching with Vercel's CDN

### 3. **Developer Experience**
- Single codebase (TypeScript only)
- No Docker builds
- Instant preview deployments
- Unified logging and monitoring

### 4. **Maintenance**
- No Go server to maintain
- Automatic SSL certificates
- Database backups handled by Vercel
- One dashboard for everything

## API Endpoint Mapping

All endpoints remain the same, just served by Next.js instead of Go:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/callback` | OAuth callback handling |
| `GET /api/user` | Get current user |
| `GET /api/user/info` | Get user details |
| `POST /api/user/refresh` | Refresh JWT token |
| `POST /api/user/update-email` | Update email |
| `DELETE /api/user/delete` | Delete account |
| `POST /api/vault/register` | Register vault |
| `POST /api/vault/recover` | Recover vault |
| `POST /api/vault/refresh` | Refresh metadata |
| `GET /api/vault/status` | Get vault status |
| `POST /api/entries` | Add entry |
| `GET /api/entries` | Get all entries |
| `GET /api/entries/list` | List entry names |
| `DELETE /api/entries` | Delete entry |
| `GET /api/stats` | User statistics |

## Cleanup

After successful migration:

1. Delete Cloud Run service
2. Delete Cloud SQL instance
3. Remove Google Cloud service account
4. Delete the `server/` directory from your repo
5. Update any CI/CD pipelines

## Troubleshooting

### Database Connection Issues
- Ensure Vercel Postgres is properly connected to your project
- Check that environment variables are set in Vercel dashboard
- Use `npx prisma studio` locally to inspect data

### Authentication Issues
- JWT_SECRET must match between local and production
- Ensure NextAuth is properly configured
- Check that OAuth callbacks are updated

### Performance Issues
- Enable Edge Runtime for API routes if needed
- Use Vercel Analytics to identify bottlenecks
- Consider upgrading Vercel plan for more resources 