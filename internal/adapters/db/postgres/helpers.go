package postgres

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"clicky-store/internal/core/domains"

	"github.com/jackc/pgx/v5/pgconn"
)

type scanner interface {
	Scan(dest ...any) error
}

func mapError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, sql.ErrNoRows) {
		return domains.ErrNotFound
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return domains.ErrConflict
		case "23503":
			return domains.ErrNotFound
		case "23514":
			return domains.ErrInvalid
		}
	}

	return err
}

func newID(prefix string) string {
	raw := make([]byte, 8)
	if _, err := rand.Read(raw); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UTC().UnixNano())
	}

	return prefix + "_" + hex.EncodeToString(raw)
}

func normalizeEmail(email string) string {
	return domains.NormalizeEmail(email)
}

func normalizeCurrency(currency string) string {
	return domains.NormalizeCurrency(currency)
}

func normalizeRole(role string) string {
	return domains.NormalizeRole(role)
}

func normalizePaymentMethod(method string) string {
	return domains.NormalizePaymentMethod(method)
}

func validateProduct(product domains.Product) error {
	return domains.ValidateProduct(product)
}
