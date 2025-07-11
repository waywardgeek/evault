# 🍎 Apple Cookie Domain Issue Fix

## 🔍 **Problem**
**Error:** `Cookie "aasp" has been rejected for invalid domain`

This error occurs during Apple Sign-In when Apple's authentication service cannot set required cookies due to domain configuration mismatches.

## 🎯 **Root Cause**
The issue was caused by **Service ID mismatches** across configuration files:
- `generate-apple-secret.js`: `com.evaultapp.web`
- `apple-developer-domain-association.txt`: `com.evaultapp.main` ❌
- `apple-association/route.ts`: `com.evaultapp.main` ❌

## ✅ **Solution Applied**

### 1. **Fixed Service ID Consistency**
All configuration files now use the same Service ID: `com.evaultapp.web`

**Updated files:**
- ✅ `client/public/.well-known/apple-developer-domain-association.txt`
- ✅ `client/src/app/api/apple-association/route.ts`

### 2. **Enhanced Apple ID Token Validation**
- ✅ Added proper Apple ID token validation in server
- ✅ Improved error handling and logging
- ✅ Secure token verification with Apple's public keys

### 3. **Created Fix Script**
Run `./fix-apple-auth.sh` to automatically check and fix Apple authentication issues.

## 🚀 **Next Steps**

### **1. Environment Variables**
Add these to your `client/.env.local`:
```bash
APPLE_ID=com.evaultapp.web
APPLE_SECRET=[Your generated JWT token]
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=[Random secret]
```

### **2. Apple Developer Console**
Ensure your Apple Developer Console configuration matches:
- **Service ID:** `com.evaultapp.web`
- **Domain:** Your actual domain (or localhost for testing)
- **Return URL:** `https://your-domain.com/api/auth/callback/apple`

### **3. Domain Association**
Verify the domain association file is accessible at:
```
https://your-domain.com/.well-known/apple-developer-domain-association.txt
```

### **4. Generate New Apple Secret**
If needed, run:
```bash
node generate-apple-secret.js
```

## 🧪 **Testing**
1. **Clear all cookies** and browser storage
2. **Restart your development server**
3. **Test Apple Sign-In** with cleared state
4. **Check browser console** for any remaining errors

## 💡 **Pro Tips**
- **Use HTTPS** even in development for Apple Sign-In
- **Clear cookies** between authentication tests
- **Check Apple Developer Console** for domain verification status
- **Ensure domain association file** is publicly accessible

## 🔧 **Troubleshooting**
If you still see cookie domain errors:

1. **Verify Service ID consistency** across all files
2. **Check Apple Developer Console** domain configuration
3. **Ensure HTTPS** is used (Apple requires secure contexts)
4. **Verify callback URL** matches Apple configuration
5. **Clear browser cookies** completely

---

**✅ The Service ID mismatch has been fixed. Your Apple authentication should now work correctly!** 