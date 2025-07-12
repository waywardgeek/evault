# eVault Vercel Deployment Checklist

## Pre-Deployment Steps

### 1. Vercel Account Setup
- [ ] Create/login to Vercel account at https://vercel.com
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Authenticate CLI: `vercel login`

### 2. Create Vercel Postgres Database
- [ ] Go to Vercel Dashboard → Storage
- [ ] Click "Create Database" → Select "Postgres"
- [ ] Choose region closest to your users
- [ ] Select plan (Hobby for testing, Pro for production)
- [ ] Connect database to your project

### 3. Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables:
- [ ] `NEXTAUTH_URL` - Set to your production URL (e.g., https://evaultapp.com)
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `JWT_SECRET` - Generate with: `openssl rand -base64 32`

#### Google OAuth:
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

#### Apple OAuth:
- [ ] `APPLE_ID` - Your Service ID (e.g., com.evaultapp.web)
- [ ] `APPLE_TEAM_ID` - Your Apple Team ID
- [ ] `APPLE_KEY_ID` - Your Apple Key ID
- [ ] `APPLE_SECRET` - Your generated Apple JWT

### 4. OAuth Provider Configuration

#### Google:
- [ ] Add production URL to authorized JavaScript origins
- [ ] Add `https://yourdomain.com/api/auth/callback/google` to redirect URIs

#### Apple:
- [ ] Add production domain to Service ID
- [ ] Verify domain ownership with `.well-known` file
- [ ] Add `https://yourdomain.com/api/auth/callback/apple` to redirect URLs

## Deployment Steps

### 1. Initial Deployment
```bash
cd client
vercel
```

Follow prompts:
- Link to existing project or create new
- Select framework preset: Next.js
- Build settings will be auto-detected

### 2. Database Setup
After first deployment:
```bash
# Push schema to production database
vercel env pull .env.production.local
npx prisma db push
```

### 3. Verify Deployment
- [ ] Visit your production URL
- [ ] Check browser console for errors
- [ ] Test Google Sign In
- [ ] Test Apple Sign In
- [ ] Create a test vault
- [ ] Add a test entry

## Post-Deployment

### 1. Monitor Performance
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor database usage in Vercel Dashboard

### 2. Security
- [ ] Verify all environment variables are set
- [ ] Check that sensitive data isn't exposed
- [ ] Test rate limiting on API endpoints

### 3. Clean Up Old Infrastructure
- [ ] Delete Google Cloud Run service
- [ ] Delete Google Cloud SQL instance
- [ ] Remove unused service accounts
- [ ] Cancel any unused subscriptions

## Troubleshooting

### Build Failures
```bash
# Check build logs
vercel logs

# Test build locally
npm run build
```

### Database Connection Issues
```bash
# Verify connection
vercel env pull
npx prisma db push
```

### OAuth Not Working
- Double-check redirect URLs match exactly
- Ensure environment variables have no extra spaces
- Verify domain ownership (Apple)

## Production Best Practices

1. **Enable Vercel Protection**
   - Password protection for staging
   - DDoS protection

2. **Set Up Monitoring**
   - Vercel Analytics
   - Real User Monitoring
   - Error tracking

3. **Configure Caching**
   - Static assets: `max-age=31536000`
   - API routes: Consider edge caching

4. **Database Optimization**
   - Enable connection pooling
   - Monitor slow queries
   - Set up automated backups

## Rollback Plan

If issues arise:
```bash
# Instant rollback to previous deployment
vercel rollback

# Or redeploy specific commit
vercel --prod --force
```

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs
- NextAuth Docs: https://next-auth.js.org
- Discord/Support: Your contact info here 