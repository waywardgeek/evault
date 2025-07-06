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
			filePath := filepath.Join(migrationDir, file.Name())
			if err := s.executeMigration(filePath); err != nil {
				return fmt.Errorf("failed to execute migration %s: %w", file.Name(), err)
			}
		}
	}

	return nil
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
