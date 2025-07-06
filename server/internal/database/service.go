package database

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) RunMigrations() error {
	// First, ensure migration tracking table exists
	if err := s.ensureMigrationTable(); err != nil {
		return fmt.Errorf("failed to create migration tracking table: %w", err)
	}

	// Get the directory of the current file
	migrationDir := "migrations"

	// Read migration files
	files, err := ioutil.ReadDir(migrationDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Execute migrations in order
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".sql") {
			// Check if migration has already been applied
			applied, err := s.isMigrationApplied(file.Name())
			if err != nil {
				return fmt.Errorf("failed to check migration status %s: %w", file.Name(), err)
			}

			if applied {
				continue // Skip already applied migrations
			}

			filePath := filepath.Join(migrationDir, file.Name())
			if err := s.executeMigration(filePath); err != nil {
				return fmt.Errorf("failed to execute migration %s: %w", file.Name(), err)
			}

			// Mark migration as applied
			if err := s.markMigrationApplied(file.Name()); err != nil {
				return fmt.Errorf("failed to mark migration as applied %s: %w", file.Name(), err)
			}
		}
	}

	return nil
}

func (s *Service) ensureMigrationTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
	_, err := s.db.Exec(query)
	return err
}

func (s *Service) isMigrationApplied(filename string) (bool, error) {
	query := `SELECT COUNT(*) FROM schema_migrations WHERE version = $1`
	var count int
	err := s.db.QueryRow(query, filename).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Service) markMigrationApplied(filename string) error {
	query := `INSERT INTO schema_migrations (version) VALUES ($1)`
	_, err := s.db.Exec(query, filename)
	return err
}

func (s *Service) executeMigration(filePath string) error {
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Split the content by semicolon and execute each statement
	statements := strings.Split(string(content), ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		if _, err := s.db.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute statement: %w", err)
		}
	}

	return nil
}

func (s *Service) DB() *sql.DB {
	return s.db
}
