package postgres

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
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
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeCurrency(currency string) string {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		return "PLN"
	}

	return currency
}

func normalizeRole(role string) string {
	role = strings.ToLower(strings.TrimSpace(role))
	if role == "" {
		return "customer"
	}

	switch role {
	case "admin", "customer":
		return role
	default:
		return ""
	}
}

func normalizePaymentMethod(method string) string {
	method = strings.ToLower(strings.TrimSpace(method))
	if method == "" {
		return "simulation"
	}

	return method
}

func validateProduct(product domains.Product) error {
	if strings.TrimSpace(product.Name) == "" ||
		strings.TrimSpace(product.Slug) == "" ||
		strings.TrimSpace(product.Description) == "" ||
		strings.TrimSpace(product.Category) == "" ||
		product.PriceCents <= 0 ||
		product.DPI <= 0 ||
		product.Stock < 0 {
		return domains.ErrInvalid
	}

	return nil
}
