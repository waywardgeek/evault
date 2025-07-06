package database

import (
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	UserID          string    `db:"user_id" json:"user_id"`
	Email           string    `db:"email" json:"email"`
	PhoneNumber     *string   `db:"phone_number" json:"phone_number,omitempty"`
	AuthProvider    string    `db:"auth_provider" json:"auth_provider"`
	Verified        bool      `db:"verified" json:"verified"`
	OpenADPMetadata *string   `db:"openadp_metadata" json:"openadp_metadata,omitempty"`
	VaultPublicKey  *string   `db:"vault_public_key" json:"vault_public_key,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

type Entry struct {
	UserID       string    `db:"user_id" json:"user_id"`
	Name         string    `db:"name" json:"name"`
	HPKEBlob     []byte    `db:"hpke_blob" json:"hpke_blob"`
	DeletionHash []byte    `db:"deletion_hash" json:"deletion_hash"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

// User operations
func (s *Service) CreateUser(user *User) error {
	query := `
		INSERT INTO users (user_id, email, phone_number, auth_provider, verified, openadp_metadata, vault_public_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id) DO UPDATE SET
			email = EXCLUDED.email,
			phone_number = EXCLUDED.phone_number,
			verified = EXCLUDED.verified,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := s.db.Exec(query, user.UserID, user.Email, user.PhoneNumber, user.AuthProvider, user.Verified, user.OpenADPMetadata, user.VaultPublicKey, user.CreatedAt, user.UpdatedAt)
	return err
}

func (s *Service) GetUserByID(userID string) (*User, error) {
	query := `
		SELECT user_id, email, phone_number, auth_provider, verified, openadp_metadata, vault_public_key, created_at, updated_at
		FROM users
		WHERE user_id = $1
	`

	user := &User{}
	err := s.db.QueryRow(query, userID).Scan(
		&user.UserID,
		&user.Email,
		&user.PhoneNumber,
		&user.AuthProvider,
		&user.Verified,
		&user.OpenADPMetadata,
		&user.VaultPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *Service) GetUserByEmail(email string) (*User, error) {
	query := `
		SELECT user_id, email, phone_number, auth_provider, verified, openadp_metadata, vault_public_key, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &User{}
	err := s.db.QueryRow(query, email).Scan(
		&user.UserID,
		&user.Email,
		&user.PhoneNumber,
		&user.AuthProvider,
		&user.Verified,
		&user.OpenADPMetadata,
		&user.VaultPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *Service) UpdateUserOpenADPMetadata(userID string, metadata string) error {
	query := `
		UPDATE users
		SET openadp_metadata = $2, updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, metadata, time.Now())
	return err
}

func (s *Service) UpdateUserVaultPublicKey(userID string, publicKey string) error {
	query := `
		UPDATE users
		SET vault_public_key = $2, updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, publicKey, time.Now())
	return err
}

// Entry operations (placeholder for Phase 3)
func (s *Service) CreateEntry(entry *Entry) error {
	query := `
		INSERT INTO entries (user_id, name, hpke_blob, deletion_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, name) DO UPDATE SET
			hpke_blob = EXCLUDED.hpke_blob,
			deletion_hash = EXCLUDED.deletion_hash,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	entry.CreatedAt = now
	entry.UpdatedAt = now

	_, err := s.db.Exec(query, entry.UserID, entry.Name, entry.HPKEBlob, entry.DeletionHash, entry.CreatedAt, entry.UpdatedAt)
	return err
}

func (s *Service) GetEntriesByUserID(userID string) ([]Entry, error) {
	query := `
		SELECT user_id, name, hpke_blob, deletion_hash, created_at, updated_at
		FROM entries
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get entries: %w", err)
	}
	defer rows.Close()

	var entries []Entry
	for rows.Next() {
		var entry Entry
		err := rows.Scan(
			&entry.UserID,
			&entry.Name,
			&entry.HPKEBlob,
			&entry.DeletionHash,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan entry: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

func (s *Service) GetEntryByNameAndUserID(name, userID string) (*Entry, error) {
	query := `
		SELECT user_id, name, hpke_blob, deletion_hash, created_at, updated_at
		FROM entries
		WHERE user_id = $1 AND name = $2
	`

	entry := &Entry{}
	err := s.db.QueryRow(query, userID, name).Scan(
		&entry.UserID,
		&entry.Name,
		&entry.HPKEBlob,
		&entry.DeletionHash,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("entry not found")
		}
		return nil, fmt.Errorf("failed to get entry: %w", err)
	}

	return entry, nil
}

func (s *Service) DeleteEntry(userID, name string) error {
	query := `DELETE FROM entries WHERE user_id = $1 AND name = $2`
	_, err := s.db.Exec(query, userID, name)
	return err
}
