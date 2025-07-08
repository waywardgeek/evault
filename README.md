# eVaultApp - Secure Personal Data Vault

eVaultApp is a secure personal data vault that uses distributed cryptography (OpenADP) to provide nation-state resistant protection for your sensitive information.

## Features

- 🔒 **Secure Storage**: Store sensitive data with distributed cryptography protection
- 🌍 **Distributed Trust**: No single point of failure across multiple countries
- ⚡ **Frictionless Access**: Add entries without PIN, view with PIN protection
- 🛡️ **Nation-State Resistant**: OpenADP transforms simple PINs into cryptographically strong keys

## Architecture

- **Server**: Go backend with PostgreSQL database
- **Client**: Next.js 14 with TypeScript and Tailwind CSS
- **Cryptography**: OpenADP distributed threshold cryptography
- **Authentication**: Google OAuth (coming in Phase 2)

## Development Status

- ✅ **Phase 1**: Project Foundation & Database Setup
- ⏳ **Phase 2**: Authentication & User Management
- ⏳ **Phase 3**: Core API Implementation
- ⏳ **Phase 4**: Security & Crypto Integration
- ⏳ **Phase 5**: Testing & Local Development
- ⏳ **Phase 6**: GCP Deployment

## Quick Start

### Prerequisites

- Go 1.23+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Setup

1. Clone the repository and navigate to the project directory
2. Set up the development environment:
   ```bash
   make setup
   ```

### Running the Application

#### Option 1: Docker Compose (Recommended)
```bash
# Start all services
make dev-up

# Stop all services
make dev-down
```

#### Option 2: Local Development
```bash
# Start PostgreSQL
make db-setup

# Run server (terminal 1)
make server

# Run client (terminal 2)
make client
```

### Access the Application

- **Client**: http://localhost:3000
- **Server**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## Project Structure

```
evault/
├── server/                    # Go backend
│   ├── cmd/server/           # Main application
│   ├── internal/             # Internal packages
│   │   ├── database/         # Database layer
│   │   ├── handlers/         # HTTP handlers
│   │   ├── auth/             # Authentication (Phase 2)
│   │   └── crypto/           # Cryptography (Phase 3)
│   ├── migrations/           # Database migrations
│   └── pkg/types/           # Shared types
├── client/                   # Next.js frontend
│   ├── src/app/             # App Router pages
│   ├── src/components/      # React components
│   ├── src/lib/             # Utilities
│   └── src/types/           # TypeScript types
├── shared/                   # Shared types
└── docker-compose.yml       # Local development
```

## Database Schema

### Users Table
- `user_id` (Primary Key)
- `email`
- `phone_number`
- `auth_provider`
- `verified`
- `openadp_metadata` (Base64 encoded)
- `vault_public_key` (Base64 encoded HPKE public key)
- `created_at`, `updated_at`

### Entries Table
- `user_id`, `name` (Composite Primary Key)
- `hpke_blob` (Base64 encoded HPKE ciphertext)
- `deletion_hash` (Base64 encoded hash for deletion)
- `created_at`, `updated_at`

## Testing

```bash
# Run Phase 1 tests
make test-phase1

# Check service health
make health

# View project structure
make structure
```

## Development Commands

```bash
make help          # Show all available commands
make setup         # Set up development environment
make dev-up        # Start all services
make dev-down      # Stop all services
make server        # Run Go server locally
make client        # Run Next.js client locally
make test-phase1   # Run Phase 1 tests
make clean         # Clean up generated files
make db-setup      # Set up PostgreSQL database
make health        # Check service health
```

## Environment Variables

Copy `server/config.env.example` to `server/.env` and configure:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=evault

# Server
PORT=8080
ENV=development

# OAuth (Phase 2)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenADP (Phase 3)
OPENADP_SERVERS_URL=https://openadp.example.com/servers.json
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Security

For security issues, please email security@evault.example.com instead of using the issue tracker.

