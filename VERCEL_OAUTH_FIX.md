# 🔧 Fix OAuth Issues on Vercel

## 🔍 **Problem Diagnosis**

Based on the analysis of your eVault system, the OAuth issues on Vercel are caused by:

1. **Missing Environment Variables**: Google OAuth credentials not configured in Vercel
2. **Insecure Configuration**: Placeholder secrets in `vercel.json` 
3. **Domain Mismatch**: OAuth redirect URLs not configured for Vercel domain
4. **Backend Communication**: Frontend can't authenticate with Go backend

## 🛠️ **Step-by-Step Fix**

### **Step 1: Generate Secure Secrets**

```bash
# Generate a secure NextAuth secret
openssl rand -base64 32

# Example output: 
# Kd8zX2vF9wE6tR3mN7qW8pL1sA4yU5jH6kI9oP0bC2x
```

### **Step 2: Configure Google OAuth**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Configure:
   - **Application type**: Web application
   - **Name**: eVault Production
   - **Authorized JavaScript origins**: 
     - `https://your-vercel-app.vercel.app`
     - `http://localhost:3000` (for local development)
   - **Authorized redirect URIs**:
     - `https://your-vercel-app.vercel.app/api/auth/callback/google` (for production)
     - `http://localhost:3000/api/auth/callback/google` (for local development)

**⚠️ IMPORTANT**: The redirect URI must point to NextAuth's callback endpoint (`/api/auth/callback/google`), NOT your Go server's callback endpoint (`/api/auth/callback`).

### **Step 3: Set Environment Variables in Vercel**

In the Vercel dashboard:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add these variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret-from-step-1

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Backend API
NEXT_PUBLIC_API_URL=https://evault-server-768291069844.us-central1.run.app
```

### **Step 4: Update Backend Environment Variables**

Update your Go backend on Google Cloud Run:

```bash
gcloud run services update evault-server \
  --region=us-central1 \
  --set-env-vars="GOOGLE_CLIENT_ID=768291069844-pckmts7qriv97g2ubbtdgqdeshccvipq.apps.googleusercontent.com,GOOGLE_CLIENT_SECRET=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"
```

### **Step 5: Test the Fix**

1. **Deploy the changes**:
   ```bash
   cd client
   vercel --prod
   ```

2. **Test OAuth flow**:
   - Visit `https://your-vercel-app.vercel.app/login`
   - Click "Sign in with Google"
   - Should redirect to Google OAuth
   - After authentication, should redirect back to your app

3. **Check debug page**:
   - Visit `https://your-vercel-app.vercel.app/debug`
   - Verify all configurations are correct

## 🔍 **Common Issues & Solutions**

### **Issue 1: "Configuration not found" Error**
**Solution**: Ensure all environment variables are set in Vercel dashboard

### **Issue 2: "Invalid redirect_uri" Error**
**Solution**: Check Google OAuth redirect URI exactly matches:
`https://your-vercel-app.vercel.app/api/auth/callback/google`

### **Issue 3: "Client ID mismatch" Error**
**Solution**: Ensure the same Google Client ID is used in both frontend and backend

### **Issue 4: CORS Errors**
**Solution**: Verify `NEXT_PUBLIC_API_URL` points to your correct backend URL

## 🧪 **Testing Checklist**

- [ ] Environment variables set in Vercel dashboard
- [ ] Google OAuth credentials configured
- [ ] Backend updated with OAuth credentials
- [ ] Login page loads without errors
- [ ] Google OAuth button works
- [ ] Successful authentication redirects to dashboard
- [ ] Debug page shows all green checkmarks

## 🚀 **Quick Commands**

```bash
# Deploy to Vercel
cd client && vercel --prod

# Update backend
gcloud run services update evault-server --region=us-central1 --set-env-vars="GOOGLE_CLIENT_ID=your-id,GOOGLE_CLIENT_SECRET=your-secret"

# Test locally first
cd client && npm run dev
```

## 📞 **If Issues Persist**

Check the browser console and Vercel function logs for specific error messages. The most common issues are:

1. **Environment variables not set**: Check Vercel dashboard
2. **Google OAuth not configured**: Verify redirect URIs
3. **Backend connection issues**: Check API URL and CORS settings

---

**Next Steps**: After fixing OAuth, test the full authentication flow and vault operations. 
