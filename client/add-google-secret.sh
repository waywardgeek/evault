#!/bin/bash

echo "🔐 Adding Google Client Secret to .env"
echo ""
echo "Please follow these steps:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Click on your OAuth 2.0 Client ID:"
echo "   768291069844-pckmts7qriv97g2ubbtdgqdeshccvipq.apps.googleusercontent.com"
echo "3. Copy the Client Secret"
echo ""
read -p "Paste your Google Client Secret here: " GOOGLE_SECRET

if [ -z "$GOOGLE_SECRET" ]; then
    echo "❌ No secret provided. Exiting."
    exit 1
fi

# Check if GOOGLE_CLIENT_SECRET already exists in .env
if grep -q "^GOOGLE_CLIENT_SECRET=" .env 2>/dev/null; then
    # Update existing
    sed -i "s/^GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=$GOOGLE_SECRET/" .env
    echo "✅ Updated GOOGLE_CLIENT_SECRET in .env"
else
    # Add new
    echo "" >> .env
    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_SECRET" >> .env
    echo "✅ Added GOOGLE_CLIENT_SECRET to .env"
fi

echo ""
echo "🎉 Google OAuth is now configured for local development!"
echo ""
echo "Next steps:"
echo "1. Restart the dev server (Ctrl+C and npm run dev)"
echo "2. Visit http://localhost:3000/test-auth"
echo "3. Click 'Sign in with Google' to test" 