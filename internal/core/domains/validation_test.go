package domains

import (
	"errors"
	"testing"
)

func TestNormalizationHelpers(t *testing.T) {
	if got := NormalizeEmail(" Customer@Example.COM "); got != "customer@example.com" {
		t.Fatalf("NormalizeEmail = %q", got)
	}
	if got := NormalizeCurrency(""); got != "PLN" {
		t.Fatalf("NormalizeCurrency empty = %q, want PLN", got)
	}
	if got := NormalizeCurrency(" eur "); got != "EUR" {
		t.Fatalf("NormalizeCurrency = %q, want EUR", got)
	}
	if got := NormalizeRole(""); got != "customer" {
		t.Fatalf("NormalizeRole empty = %q, want customer", got)
	}
	if got := NormalizeRole("Manager"); got != "" {
		t.Fatalf("NormalizeRole invalid = %q, want empty", got)
	}
	if got := NormalizePaymentMethod(""); got != "simulation" {
		t.Fatalf("NormalizePaymentMethod empty = %q, want simulation", got)
	}
}

func TestNormalizeAndValidateProduct(t *testing.T) {
	product := NormalizeProduct(Product{
		Name:        "  Test Mouse  ",
		Slug:        " test-mouse ",
		Description: "  A trimmed test mouse.  ",
		Category:    " Gaming ",
		PriceCents:  1000,
		Currency:    " pln ",
		DPI:         1000,
		Stock:       2,
		ImageURL:    " /assets/products/test.jpg ",
	})

	if product.Name != "Test Mouse" ||
		product.Slug != "test-mouse" ||
		product.Description != "A trimmed test mouse." ||
		product.Category != "gaming" ||
		product.Currency != "PLN" ||
		product.ImageURL != "/assets/products/test.jpg" {
		t.Fatalf("normalized product = %+v", product)
	}
	if err := ValidateProduct(product); err != nil {
		t.Fatalf("ValidateProduct: %v", err)
	}

	product.PriceCents = 0
	if err := ValidateProduct(product); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ValidateProduct invalid error = %v, want ErrInvalid", err)
	}
}
