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
	@echo "   Note: Start PostgreSQL first with 'make dev-up'"
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

# Quick database setup
db-setup:
	@echo "Setting up PostgreSQL database..."
	docker-compose up -d postgres
	@echo "Database will be available at localhost:5432"
	@echo "Database: evault"
	@echo "Username: postgres"
	@echo "Password: password"

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