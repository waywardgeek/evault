#!/bin/bash

# 🔧 OAuth Debug Script for eVault
# This script helps diagnose OAuth configuration issues

echo "🔍 eVault OAuth Configuration Debug"
echo "====================================="

# Check if we're in the right directory
if [[ ! -f "client/vercel.json" ]]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Environment Variables Check:"
echo "------------------------------"

# Check local environment variables
echo "🖥️  Local Environment:"
echo "GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-❌ NOT SET}"
echo "GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-❌ NOT SET}"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-❌ NOT SET}"
echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-❌ NOT SET}"

echo ""
echo "🌐 Vercel Deployment URLs:"
echo "-------------------------"

# Check if vercel CLI is available
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI found"
    echo "🚀 Getting deployment info..."
    
    # Get project info
    vercel ls --scope=team 2>/dev/null || vercel ls 2>/dev/null || echo "❌ No Vercel projects found"
else
    echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
fi

echo ""
echo "🔍 Configuration Analysis:"
echo "-------------------------"

# Check client configuration
echo "📁 Client Configuration:"
if [[ -f "client/src/lib/auth.ts" ]]; then
    echo "✅ NextAuth configuration found"
    
    # Check for Google provider
    if grep -q "GoogleProvider" client/src/lib/auth.ts; then
        echo "✅ Google OAuth provider configured"
    else
        echo "❌ Google OAuth provider not found"
    fi
    
    # Check for environment variable usage
    if grep -q "process.env.GOOGLE_CLIENT_ID" client/src/lib/auth.ts; then
        echo "✅ Environment variables referenced"
    else
        echo "❌ Environment variables not properly referenced"
    fi
else
    echo "❌ NextAuth configuration not found"
fi

echo ""
echo "🔧 Server Configuration:"
if [[ -f "server/internal/auth/service.go" ]]; then
    echo "✅ Go auth service found"
    
    if grep -q "GoogleProvider\|google" server/internal/auth/service.go; then
        echo "✅ Google OAuth integration found"
    else
        echo "❌ Google OAuth integration not found"
    fi
else
    echo "❌ Go auth service not found"
fi

echo ""
echo "🧪 Quick Tests:"
echo "---------------"

# Test local server
echo "🖥️  Testing local server..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Local server is running"
else
    echo "❌ Local server not running (this is OK if not developing locally)"
fi

# Test local client
echo "🌐 Testing local client..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Local client is running"
else
    echo "❌ Local client not running (this is OK if not developing locally)"
fi

echo ""
echo "🚀 Recommended Actions:"
echo "----------------------"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Configure Google OAuth redirect URIs"
echo "3. Update backend environment variables"
echo "4. Test OAuth flow end-to-end"
echo ""
echo "📖 See VERCEL_OAUTH_FIX.md for detailed instructions"
echo ""
echo "🔧 Generate NextAuth secret:"
echo "openssl rand -base64 32"
echo ""
echo "🌐 Common URLs to check:"
echo "- Google Cloud Console: https://console.cloud.google.com/"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- Your app: https://your-vercel-app.vercel.app" 