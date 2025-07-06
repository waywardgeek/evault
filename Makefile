# eVault Development Makefile

.PHONY: help dev server client db openadp setup-env install-deps clean

# Default target
help:
	@echo "eVault Development Commands:"
	@echo "  make dev         - Start all services (db, server, client, openadp)"
	@echo "  make server      - Start Go server only"
	@echo "  make client      - Start Next.js client only"
	@echo "  make db          - Start PostgreSQL database"
	@echo "  make openadp     - Start OpenADP service (mock)"
	@echo "  make openadp-real - Start Real OpenADP service (live servers)"
	@echo "  make setup-env   - Setup environment and dependencies"
	@echo "  make install-deps - Install all dependencies"
	@echo "  make clean       - Clean build artifacts and containers"

# Development: Start all services
dev:
	@echo "Starting eVault development environment..."
	@make db &
	@sleep 3
	@make openadp &
	@sleep 2
	@make server &
	@sleep 2
	@make client &
	@echo "All services started!"

# Database
db:
	@echo "Starting PostgreSQL database..."
	@if [ ! "$$(docker ps -q -f name=evault-db)" ]; then \
		if [ "$$(docker ps -a -q -f name=evault-db)" ]; then \
			docker start evault-db; \
		else \
			docker run -d --name evault-db \
				-e POSTGRES_DB=evault \
				-e POSTGRES_USER=evault \
				-e POSTGRES_PASSWORD=evault123 \
				-p 5432:5432 \
				postgres:15; \
		fi; \
	else \
		echo "Database already running"; \
	fi

# OpenADP Service (Mock)
openadp:
	@echo "Starting OpenADP service..."
	cd server && npm run openadp

# Real OpenADP Service (Live servers)
openadp-real:
	@echo "Starting Real OpenADP service..."
	cd server && node real_openadp_service.js

# Go Server
server:
	@echo "Starting Go server..."
	cd server && go run cmd/server/main.go

# Next.js Client
client:
	@echo "Starting Next.js client..."
	cd client && npm run dev

# Setup environment
setup-env:
	@echo "Setting up eVault development environment..."
	@make install-deps
	@make db
	@echo "Environment setup complete!"

# Install dependencies
install-deps:
	@echo "Installing dependencies..."
	@echo "Installing Go dependencies..."
	cd server && go mod download
	@echo "Installing Node.js dependencies..."
	cd client && npm install
	cd server && npm install
	@echo "Dependencies installed!"

# Clean everything
clean:
	@echo "Cleaning eVault environment..."
	@docker stop evault-db || true
	@docker rm evault-db || true
	@docker volume rm evault-db-data || true
	@echo "Cleaned!"

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