# eVault Development Makefile

.PHONY: help setup dev-up dev-down server client test-phase1 clean

# Default target
help:
	@echo "eVault Development Commands:"
	@echo "  setup        - Set up the development environment"
	@echo "  dev-up       - Start all services with Docker Compose"
	@echo "  dev-down     - Stop all services"
	@echo "  server       - Run Go server locally"
	@echo "  client       - Run Next.js client locally"
	@echo "  test-phase1  - Run Phase 1 tests"
	@echo "  clean        - Clean up generated files"
	@echo ""
	@echo "Database Options:"
	@echo "  db-docker    - Start Docker PostgreSQL (port 5433)"
	@echo "  db-local     - Instructions for using local PostgreSQL (port 5432)"

# Setup development environment
setup:
	@echo "Setting up eVault development environment..."
	@echo "1. Installing server dependencies..."
	cd server && go mod download
	@echo "2. Installing client dependencies..."
	cd client && npm install
	@echo "3. Creating environment file..."
	cp server/config.env.example server/.env
	@echo "✅ Setup complete!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "   - Check server/.env and update DB_PORT (5433 for Docker, 5432 for local)"
	@echo "   - Run 'make dev-up' to start with Docker PostgreSQL"
	@echo "   - Or run 'make db-local' for local PostgreSQL instructions"

# Start all services
dev-up:
	@echo "Starting eVault development environment..."
	docker-compose up -d postgres
	@echo "Waiting for database to be ready..."
	sleep 5
	@echo "Starting server and client..."
	docker-compose up server client

# Stop all services
dev-down:
	@echo "Stopping eVault development environment..."
	docker-compose down

# Run server locally
server:
	@echo "Starting Go server..."
	cd server && go run cmd/server/main.go

# Run client locally
client:
	@echo "Starting Next.js client..."
	cd client && npm run dev

# Run Phase 1 tests
test-phase1:
	@echo "Running Phase 1 tests..."
	@echo "1. Testing server build..."
	cd server && go build cmd/server/main.go
	@echo "2. Testing client build..."
	cd client && npm run build
	@echo "3. Testing TypeScript compilation..."
	cd client && npm run type-check
	@echo "4. Testing database migration (requires PostgreSQL)..."
	@echo "   Note: Start PostgreSQL first with 'make dev-up' or 'make db-docker'"
	@echo "✅ Phase 1 tests complete!"

# Clean up generated files
clean:
	@echo "Cleaning up generated files..."
	rm -f server/server
	rm -f server/main
	rm -rf client/.next
	rm -rf client/out
	docker-compose down -v
	@echo "✅ Cleanup complete!"

# Quick database setup - Docker PostgreSQL
db-docker:
	@echo "Setting up Docker PostgreSQL..."
	docker-compose up -d postgres
	@echo "✅ Database will be available at localhost:5433"
	@echo "Database: evault"
	@echo "Username: postgres"
	@echo "Password: password"
	@echo ""
	@echo "📝 Update server/.env to use:"
	@echo "   DB_PORT=5433"

# Instructions for local PostgreSQL
db-local:
	@echo "Using Local PostgreSQL Setup:"
	@echo ""
	@echo "1. Create database:"
	@echo "   sudo -u postgres createdb evault"
	@echo ""
	@echo "2. Update server/.env to use:"
	@echo "   DB_PORT=5432"
	@echo "   DB_PASSWORD=your_local_postgres_password"
	@echo ""
	@echo "3. Test connection:"
	@echo "   psql -h localhost -p 5432 -U postgres -d evault"

# Check health of services
health:
	@echo "Checking service health..."
	@echo "Server health:"
	@curl -f http://localhost:8080/health || echo "❌ Server not running"
	@echo ""
	@echo "Client health:"
	@curl -f http://localhost:3000 || echo "❌ Client not running"

# Show project structure
structure:
	@echo "eVault Project Structure:"
	@tree -I 'node_modules|.git|.next|build|vendor' -L 3 . 