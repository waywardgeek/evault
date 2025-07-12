#!/bin/bash

echo "🚀 Setting up local PostgreSQL database for eVault..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql"
    echo "   macOS: brew install postgresql"
    exit 1
fi

# Database configuration
DB_NAME="evault_dev"
DB_USER="evault_user"
DB_PASSWORD="evault_dev_password"

# Create database and user
echo "📦 Creating database and user..."
sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${DB_USER}') THEN
      CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

# Create .env.local file
echo "📝 Creating .env.local file..."
cat > .env.local <<EOF
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production

# OAuth Providers (add your actual values)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

APPLE_ID=your-apple-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_SECRET=your-generated-apple-jwt

# Local PostgreSQL Database
POSTGRES_PRISMA_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
POSTGRES_URL_NON_POOLING="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"

# JWT Secret for API authentication
JWT_SECRET=dev-jwt-secret-change-in-production
EOF

echo "✅ Local database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update OAuth credentials in .env.local"
echo "2. Run: npx prisma db push"
echo "3. Run: npm run dev"
echo ""
echo "🔐 Database connection string:"
echo "   postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" 