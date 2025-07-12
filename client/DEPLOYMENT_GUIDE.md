# eVault Deployment Guide to Vercel

## Prerequisites
- Vercel account (sign up at vercel.com)
- GitHub repository with your code
- Production secrets ready

## Step 1: Prepare for Deployment

### 1.1 Update package.json scripts
The build script is already configured correctly in `client/package.json`:
```json
"build": "next build"
```

### 1.2 Environment Variables
You'll need to set these in Vercel:

**Required Environment Variables:**
- `NEXTAUTH_URL` - Set to your production URL (e.g., https://evaultapp.com)
- `NEXTAUTH_SECRET` - Your production secret (use the one from ~/evault_secrets)
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
- `APPLE_ID` - com.evaultapp.web
- `APPLE_TEAM_ID` - B2SUY7SU9A
- `APPLE_KEY_ID` - 4S892A36WV
- `APPLE_SECRET` - Your Apple JWT
- `JWT_SECRET` - For API authentication
- `POSTGRES_PRISMA_URL` - Will be auto-created by Vercel Postgres
- `POSTGRES_URL_NON_POOLING` - Will be auto-created by Vercel Postgres

## Step 2: Database Setup

### 2.1 Enable Vercel Postgres
1. Go to your Vercel project dashboard
2. Click on "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose your region (closest to your users)
6. Click "Create"

### 2.2 Run Database Migrations
After creating the database, you'll need to run migrations:

```bash
cd client
npx prisma generate
npx prisma db push
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# In the client directory
cd client

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Select the client directory as root
# - Use default build settings
```

### Option B: Deploy via GitHub Integration
1. Push your code to GitHub
2. Go to vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. Add all environment variables
7. Click "Deploy"

## Step 4: Post-Deployment

### 4.1 Update OAuth Redirect URIs
Update your OAuth providers with production URLs:

**Google Cloud Console:**
- Add `https://evaultapp.com/api/auth/callback/google` to authorized redirect URIs

**Apple Developer:**
- Add `https://evaultapp.com` to your service ID domains
- Add `https://evaultapp.com/api/auth/callback/apple` as return URL

### 4.2 Verify Deployment
1. Visit your production URL
2. Test Google Sign In
3. Create a vault
4. Add an entry
5. Test recovery with PIN

## Step 5: Custom Domain (if using evaultapp.com)

1. In Vercel project settings, go to "Domains"
2. Add `evaultapp.com`
3. Update your DNS records:
   - Add A record pointing to Vercel's IP
   - Or add CNAME record pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation

## Troubleshooting

### Database Connection Issues
- Ensure all Postgres environment variables are set
- Check that Prisma schema is pushed to production database

### OAuth Not Working
- Verify redirect URIs are updated for production
- Check that all OAuth secrets are correctly set in Vercel

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

## Security Checklist
- [ ] NEXTAUTH_SECRET is unique and secure for production
- [ ] JWT_SECRET is unique and secure for production
- [ ] All OAuth secrets are production values
- [ ] Database is properly secured
- [ ] HTTPS is enforced (automatic with Vercel)

## Monitoring
- Use Vercel Analytics to monitor performance
- Check Vercel Functions logs for API errors
- Monitor database usage in Vercel Storage dashboard 