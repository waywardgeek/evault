FROM golang:1.23-alpine AS builder

# Install git and other dependencies
RUN apk add --no-cache git ca-certificates

# Set the working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S evault && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G evault -g evault evault

# Set the working directory
WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

# Change ownership
RUN chown -R evault:evault /app

# Switch to non-root user
USER evault

# Expose port
EXPOSE 8080

# Run the server
CMD ["./server"] 