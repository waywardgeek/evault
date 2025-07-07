# eVault Deployment Guide

This guide will help you deploy eVault to production using GCP (Google Cloud Platform) for the backend and Vercel for the frontend.

## 🎯 **Overview**

- **Backend**: Go server on Google Cloud Run + Cloud SQL PostgreSQL
- **Frontend**: Next.js on Vercel
- **Estimated Time**: 30-45 minutes
- **Cost**: ~$10-20/month for low traffic

## 📋 **Prerequisites**

1. **Google Cloud Platform Account** with billing enabled
2. **Vercel Account** (free tier works)
3. **gcloud CLI** installed and configured
4. **Vercel CLI** installed (optional, but recommended)

### Install Required Tools

```bash
# Install gcloud CLI (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Install Vercel CLI
npm install -g vercel

# Verify installations
gcloud --version
vercel --version
```

## 🚀 **Step 1: Deploy Backend to GCP**

### 1.1 Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
```

### 1.2 Create or Select a GCP Project

```bash
# Create a new project (optional)
gcloud projects create evault-prod-$(date +%s) --name="eVault Production"

# Or select existing project
gcloud config set project YOUR_PROJECT_ID
```

### 1.3 Run the Automated Deployment Script

```bash
# From the project root
./scripts/deploy.sh
```

This script will:
- ✅ Enable required GCP APIs
- ✅ Create Cloud SQL PostgreSQL instance
- ✅ Build and deploy Go server to Cloud Run
- ✅ Configure database connections
- ✅ Set up environment variables

### 1.4 Note the Server URL

After deployment, you'll get a URL like:
```
https://evault-server-xxxxxxx-uc.a.run.app
```

**Save this URL - you'll need it for the frontend deployment!**

## 🌐 **Step 2: Deploy Frontend to Vercel**

### 2.1 Update Client Configuration

Edit `client/vercel.json` and replace the placeholder URLs:

```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-actual-server-url.run.app"
  },
  "rewrites": [
    {
      "source": "/api/server/(.*)",
      "destination": "https://your-actual-server-url.run.app/api/$1"
    }
  ]
}
```

### 2.2 Deploy to Vercel

```bash
cd client

# Login to Vercel (if not already)
vercel login

# Deploy
vercel --prod
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Your personal account
- **Link to existing project**: No
- **Project name**: evault-client
- **Directory**: `./` (current directory)

### 2.3 Set Environment Variables in Vercel

In the Vercel dashboard, set these environment variables:

```
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-secure-secret-here
NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app
```

## ✅ **Step 3: Test Your Deployment**

### 3.1 Test Backend

```bash
# Test server health
curl https://your-cloud-run-url.run.app/health

# Expected response:
# {"service":"evault-server","status":"healthy"}
```

### 3.2 Test Frontend

Visit your Vercel URL:
```
https://your-app.vercel.app
```

You should see:
- ✅ eVault homepage loads
- ✅ Navigation works
- ✅ Login page accessible
- ✅ No console errors

### 3.3 Test Integration

1. Go to `/login` 
2. Try the "Sign in with Google" button
3. Check if API calls work (currently mocked, but should connect)

## 🔒 **Step 4: Security Hardening (Recommended)**

### 4.1 Update Default Passwords

```bash
# Generate secure passwords
openssl rand -base64 32  # For JWT secret
openssl rand -base64 32  # For database password

# Update Cloud SQL password
gcloud sql users set-password evault-user \
  --instance=evault-db \
  --password=YOUR_SECURE_PASSWORD

# Update Cloud Run environment variables
gcloud run services update evault-server \
  --region=us-central1 \
  --set-env-vars="JWT_SECRET=YOUR_JWT_SECRET,DB_PASSWORD=YOUR_SECURE_PASSWORD"
```

### 4.2 Set Up Custom Domain (Optional)

1. **Purchase domain** (e.g., `yourdomain.com`)
2. **Add domain in Vercel** dashboard
3. **Configure DNS** to point to Vercel
4. **Update environment variables** with your custom domain

## 🎉 **Congratulations!**

Your eVault app is now live on the internet! 

### **Your URLs:**
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-server.run.app`
- **Health Check**: `https://your-server.run.app/health`

## 📊 **Monitoring & Next Steps**

### Monitor Your App
- **GCP Console**: Monitor Cloud Run metrics, logs, and costs
- **Vercel Dashboard**: Monitor frontend performance and usage
- **Cloud SQL**: Monitor database performance

### Next Features to Add
1. **Real Google OAuth** (Phase 2)
2. **OpenADP Integration** (Phase 3) 
3. **Custom Domain** with SSL
4. **Monitoring & Alerts**
5. **Backup Strategy**

## 💰 **Expected Costs**

For moderate usage:
- **Cloud Run**: ~$0-10/month (generous free tier)
- **Cloud SQL**: ~$7/month (db-f1-micro)
- **Vercel**: Free (hobby plan)
- **Total**: ~$7-17/month

## 🆘 **Troubleshooting**

### Common Issues

**Build Fails:**
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

**Database Connection Issues:**
```bash
# Test database connectivity
gcloud sql connect evault-db --user=evault-user
```

**Environment Variables:**
```bash
# Check Cloud Run environment
gcloud run services describe evault-server --region=us-central1
```

## 📞 **Support**

If you encounter issues:
1. Check the logs in GCP Console
2. Verify environment variables
3. Test each component separately
4. Check network connectivity

---

**Happy deploying! 🚀** 