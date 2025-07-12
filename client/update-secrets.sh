#!/bin/bash

# Update Google Client Secret
sed -i 's/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=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/' .env

# Update NextAuth Secret
sed -i 's/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=HPiqlv0KxCyXIP5DMOrdBCAV4qwOO5cbxfdNVi8LH0k=/' .env

# Update Apple Secret (the JWT)
APPLE_JWT='eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRTODkyQTM2V1YifQ.eyJpYXQiOjE3NTIyMzU2MTAsImV4cCI6MTc4Mzc5MzIxMCwiYXVkIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsImlzcyI6IkIyU1VZN1NVOUV
EiLCJzdWIiOiJjb20uZXZhdWx0YXBwLndlYiJ9.4RwPwZKRwgzyvxXJoVPYPAfzxiXIM0k2MUH95-5XP_ooymyLDSnSZfy2ISF0o4QTCL_uX6baB9HFsxJN1a-GRw'
sed -i "s|APPLE_SECRET=.*|APPLE_SECRET=$APPLE_JWT|" .env

echo "✅ Updated secrets in .env:"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - NEXTAUTH_SECRET" 
echo "   - APPLE_SECRET (JWT)"
echo ""
echo "🔄 Please restart the dev server to pick up the new secrets!"
