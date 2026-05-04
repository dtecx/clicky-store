package postgres

import (
	"context"
	"fmt"
	"strings"

	"clicky-store/internal/core/domains"
)

const userColumns = `
	id,
	name,
	email,
	role,
	password_hash,
	password_salt,
	created_at
`

func (s *Store) CreateUser(user domains.User) (domains.User, error) {
	user.ID = newID("usr")
	user.Name = strings.TrimSpace(user.Name)
	user.Email = normalizeEmail(user.Email)
	user.Role = normalizeRole(user.Role)

	if user.Name == "" || user.Email == "" || user.Role == "" || user.PasswordHash == "" || user.PasswordSalt == "" {
		return domains.User{}, domains.ErrInvalid
	}

	row := s.db.QueryRowContext(
		context.Background(),
		`INSERT INTO users (
			id,
			name,
			email,
			role,
			password_hash,
			password_salt
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+userColumns,
		user.ID,
		user.Name,
		user.Email,
		user.Role,
		user.PasswordHash,
		user.PasswordSalt,
	)

	return scanUser(row)
}

func (s *Store) ListUsers(filter domains.UserFilter) []domains.User {
	ctx := context.Background()

	role := normalizeRole(filter.Role)
	if strings.TrimSpace(filter.Role) != "" && role == "" {
		return []domains.User{}
	}

	queryText := strings.ToLower(strings.TrimSpace(filter.Query))

	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)

	if role != "" {
		args = append(args, role)
		conditions = append(conditions, fmt.Sprintf("role = $%d", len(args)))
	}

	if queryText != "" {
		args = append(args, "%"+queryText+"%")
		conditions = append(
			conditions,
			fmt.Sprintf("lower(name || ' ' || email || ' ' || id) LIKE $%d", len(args)),
		)
	}

	query := `SELECT ` + userColumns + ` FROM users`
	if len(conditions) > 0 {
		query += ` WHERE ` + strings.Join(conditions, ` AND `)
	}
	query += ` ORDER BY lower(email) ASC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return []domains.User{}
	}
	defer rows.Close()

	users := make([]domains.User, 0)
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return []domains.User{}
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return []domains.User{}
	}

	return users
}

func (s *Store) UserByEmail(email string) (domains.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT `+userColumns+` FROM users WHERE lower(email) = lower($1)`,
		normalizeEmail(email),
	)

	return scanUser(row)
}

func (s *Store) UserByID(id string) (domains.User, error) {
	row := s.db.QueryRowContext(
		context.Background(),
		`SELECT `+userColumns+` FROM users WHERE id = $1`,
		strings.TrimSpace(id),
	)

	return scanUser(row)
}

func (s *Store) UpdateUserRole(id, role string) (domains.User, error) {
	role = normalizeRole(role)
	if role == "" {
		return domains.User{}, domains.ErrInvalid
	}

	row := s.db.QueryRowContext(
		context.Background(),
		`UPDATE users
		SET role = $2
		WHERE id = $1
		RETURNING `+userColumns,
		strings.TrimSpace(id),
		role,
	)

	return scanUser(row)
}

func scanUser(row scanner) (domains.User, error) {
	var user domains.User

	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.PasswordHash,
		&user.PasswordSalt,
		&user.CreatedAt,
	)

	if err != nil {
		return domains.User{}, mapError(err)
	}

	return user, nil
}
