#!/bin/bash
# Update .env.local with known OAuth credentials

sed -i 's/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=768291069844-pckmts7qriv97g2ubbtdgqdeshccvipq.apps.googleusercontent.com/' .env.local
sed -i 's/APPLE_ID=.*/APPLE_ID=com.evaultapp.web/' .env.local
sed -i 's/APPLE_TEAM_ID=.*/APPLE_TEAM_ID=B2SUY7SU9A/' .env.local
sed -i 's/APPLE_KEY_ID=.*/APPLE_KEY_ID=4S892A36WV/' .env.local

echo "✅ Updated .env.local with known OAuth credentials"
echo "⚠️  You still need to add:"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - APPLE_SECRET (the generated JWT)"
