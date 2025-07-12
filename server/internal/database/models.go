package database

import (
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	UserID                 string    `db:"user_id" json:"user_id"`
	Email                  string    `db:"email" json:"email"`
	PhoneNumber            *string   `db:"phone_number" json:"phone_number,omitempty"`
	AuthProvider           string    `db:"auth_provider" json:"auth_provider"`
	Verified               bool      `db:"verified" json:"verified"`
	OpenADPMetadataA       *string   `db:"openadp_metadata_a" json:"openadp_metadata_a,omitempty"`
	OpenADPMetadataB       *string   `db:"openadp_metadata_b" json:"openadp_metadata_b,omitempty"`
	OpenADPMetadataCurrent bool      `db:"openadp_metadata_current" json:"openadp_metadata_current"`
	CreatedAt              time.Time `db:"created_at" json:"created_at"`
	UpdatedAt              time.Time `db:"updated_at" json:"updated_at"`
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
		INSERT INTO users (user_id, email, phone_number, auth_provider, verified, openadp_metadata_a, openadp_metadata_b, openadp_metadata_current, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id) DO UPDATE SET
			email = EXCLUDED.email,
			phone_number = EXCLUDED.phone_number,
			verified = EXCLUDED.verified,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := s.db.Exec(query, user.UserID, user.Email, user.PhoneNumber, user.AuthProvider, user.Verified, user.OpenADPMetadataA, user.OpenADPMetadataB, user.OpenADPMetadataCurrent, user.CreatedAt, user.UpdatedAt)
	return err
}

func (s *Service) GetUserByID(userID string) (*User, error) {
	query := `
		SELECT user_id, email, phone_number, auth_provider, verified, openadp_metadata_a, openadp_metadata_b, openadp_metadata_current, created_at, updated_at
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
		&user.OpenADPMetadataA,
		&user.OpenADPMetadataB,
		&user.OpenADPMetadataCurrent,
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
		SELECT user_id, email, phone_number, auth_provider, verified, openadp_metadata_a, openadp_metadata_b, openadp_metadata_current, created_at, updated_at
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
		&user.OpenADPMetadataA,
		&user.OpenADPMetadataB,
		&user.OpenADPMetadataCurrent,
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

// GetCurrentOpenADPMetadata returns the current metadata based on the flag
func (s *Service) GetCurrentOpenADPMetadata(userID string) (*string, error) {
	query := `
		SELECT 
			CASE 
				WHEN openadp_metadata_current THEN openadp_metadata_a
				ELSE openadp_metadata_b
			END as current_metadata
		FROM users
		WHERE user_id = $1
	`

	var metadata *string
	err := s.db.QueryRow(query, userID).Scan(&metadata)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get current metadata: %w", err)
	}

	return metadata, nil
}

// UpdateUserOpenADPMetadata implements the two-slot refresh cycle
func (s *Service) UpdateUserOpenADPMetadata(userID string, metadata string) error {
	// Step 1: Write to the older slot (opposite of current flag)
	// Step 2: Flip the flag to point to the new slot
	query := `
		UPDATE users
		SET 
			openadp_metadata_a = CASE WHEN openadp_metadata_current THEN openadp_metadata_a ELSE $2 END,
			openadp_metadata_b = CASE WHEN openadp_metadata_current THEN $2 ELSE openadp_metadata_b END,
			openadp_metadata_current = NOT openadp_metadata_current,
			updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, metadata, time.Now())
	return err
}

// SetInitialOpenADPMetadata sets metadata for new vault registration (slot A, flag=true)
func (s *Service) SetInitialOpenADPMetadata(userID string, metadata string) error {
	query := `
		UPDATE users
		SET 
			openadp_metadata_a = $2,
			openadp_metadata_b = NULL,
			openadp_metadata_current = TRUE,
			updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, metadata, time.Now())
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

func (s *Service) DeleteUser(userID string) error {
	query := `DELETE FROM users WHERE user_id = $1`
	_, err := s.db.Exec(query, userID)
	return err
}

// UpdateUserEmail updates the user's email address
func (s *Service) UpdateUserEmail(userID string, email string) error {
	query := `
		UPDATE users
		SET email = $2, updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, email, time.Now())
	return err
}

// UpdateAuthProvider updates the most recent auth provider used
func (s *Service) UpdateAuthProvider(userID string, provider string) error {
	query := `
		UPDATE users
		SET auth_provider = $2, updated_at = $3
		WHERE user_id = $1
	`

	_, err := s.db.Exec(query, userID, provider, time.Now())
	return err
}

// UserStats represents user statistics
type UserStats struct {
	TotalUsers       int `json:"total_users"`
	RecentSignups7d  int `json:"recent_signups_7d"`
	RecentSignups30d int `json:"recent_signups_30d"`
	UsersWithVaults  int `json:"users_with_vaults"`
	TotalEntries     int `json:"total_entries"`
}

// GetUserStats returns user statistics
func (s *Service) GetUserStats() (*UserStats, error) {
	var stats UserStats

	// Get total users
	err := s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get total users: %w", err)
	}

	// Get recent signups (7 days)
	err = s.db.QueryRow("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'").Scan(&stats.RecentSignups7d)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent signups 7d: %w", err)
	}

	// Get recent signups (30 days)
	err = s.db.QueryRow("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'").Scan(&stats.RecentSignups30d)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent signups 30d: %w", err)
	}

	// Get users with vaults (users who have openadp metadata)
	err = s.db.QueryRow("SELECT COUNT(*) FROM users WHERE openadp_metadata_a IS NOT NULL OR openadp_metadata_b IS NOT NULL").Scan(&stats.UsersWithVaults)
	if err != nil {
		return nil, fmt.Errorf("failed to get users with vaults: %w", err)
	}

	// Get total entries
	err = s.db.QueryRow("SELECT COUNT(*) FROM entries").Scan(&stats.TotalEntries)
	if err != nil {
		return nil, fmt.Errorf("failed to get total entries: %w", err)
	}

	return &stats, nil
}

// GetUsersByEmail returns all users with a specific email address
func (s *Service) GetUsersByEmail(email string) ([]User, error) {
	query := `
		SELECT user_id, email, phone_number, auth_provider, verified, openadp_metadata_a, openadp_metadata_b, openadp_metadata_current, created_at, updated_at
		FROM users
		WHERE email = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, email)
	if err != nil {
		return nil, fmt.Errorf("failed to query users by email: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.UserID,
			&user.Email,
			&user.PhoneNumber,
			&user.AuthProvider,
			&user.Verified,
			&user.OpenADPMetadataA,
			&user.OpenADPMetadataB,
			&user.OpenADPMetadataCurrent,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}
