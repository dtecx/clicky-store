package domains

import "strings"

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func NormalizeCurrency(currency string) string {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		return "PLN"
	}

	return currency
}

func NormalizeRole(role string) string {
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

func NormalizePaymentMethod(method string) string {
	method = strings.ToLower(strings.TrimSpace(method))
	if method == "" {
		return "simulation"
	}

	return method
}

func NormalizeProduct(product Product) Product {
	product.Name = strings.TrimSpace(product.Name)
	product.Slug = strings.TrimSpace(product.Slug)
	product.Description = strings.TrimSpace(product.Description)
	product.Category = strings.ToLower(strings.TrimSpace(product.Category))
	product.Currency = NormalizeCurrency(product.Currency)
	product.ImageURL = strings.TrimSpace(product.ImageURL)

	return product
}

func NormalizeProductImage(image ProductImage) ProductImage {
	image.ID = strings.TrimSpace(image.ID)
	image.ProductID = strings.TrimSpace(image.ProductID)
	image.URL = strings.TrimSpace(image.URL)
	image.AltText = strings.TrimSpace(image.AltText)

	return image
}

func ApplyProductUpdate(product Product, update ProductUpdate) Product {
	if update.Name != nil {
		product.Name = strings.TrimSpace(*update.Name)
	}
	if update.Slug != nil {
		product.Slug = strings.TrimSpace(*update.Slug)
	}
	if update.Description != nil {
		product.Description = strings.TrimSpace(*update.Description)
	}
	if update.Category != nil {
		product.Category = strings.ToLower(strings.TrimSpace(*update.Category))
	}
	if update.PriceCents != nil {
		product.PriceCents = *update.PriceCents
	}
	if update.Currency != nil {
		product.Currency = NormalizeCurrency(*update.Currency)
	}
	if update.DPI != nil {
		product.DPI = *update.DPI
	}
	if update.Wireless != nil {
		product.Wireless = *update.Wireless
	}
	if update.Ergonomic != nil {
		product.Ergonomic = *update.Ergonomic
	}
	if update.Stock != nil {
		product.Stock = *update.Stock
	}
	if update.ImageURL != nil {
		product.ImageURL = strings.TrimSpace(*update.ImageURL)
	}

	return product
}

func ApplyProductImageUpdate(image ProductImage, update ProductImageUpdate) ProductImage {
	if update.AltText != nil {
		image.AltText = strings.TrimSpace(*update.AltText)
	}
	if update.SortOrder != nil {
		image.SortOrder = *update.SortOrder
	}
	if update.IsPrimary != nil {
		image.IsPrimary = *update.IsPrimary
	}

	return image
}

func ValidateProduct(product Product) error {
	if strings.TrimSpace(product.Name) == "" ||
		strings.TrimSpace(product.Slug) == "" ||
		strings.TrimSpace(product.Description) == "" ||
		strings.TrimSpace(product.Category) == "" ||
		!validSlug(product.Slug) ||
		!validCurrency(product.Currency) ||
		product.PriceCents <= 0 ||
		product.DPI <= 0 ||
		product.Stock < 0 {
		return ErrInvalid
	}

	return nil
}

func ValidateProductImage(image ProductImage) error {
	if strings.TrimSpace(image.ProductID) == "" ||
		strings.TrimSpace(image.URL) == "" ||
		image.SortOrder < 0 {
		return ErrInvalid
	}

	return nil
}

func validSlug(slug string) bool {
	if slug == "" || slug[0] == '-' || slug[len(slug)-1] == '-' {
		return false
	}

	previousHyphen := false
	for _, r := range slug {
		switch {
		case r >= 'a' && r <= 'z':
			previousHyphen = false
		case r >= '0' && r <= '9':
			previousHyphen = false
		case r == '-':
			if previousHyphen {
				return false
			}
			previousHyphen = true
		default:
			return false
		}
	}

	return true
}

func validCurrency(currency string) bool {
	if len(currency) != 3 {
		return false
	}

	for _, r := range currency {
		if r < 'A' || r > 'Z' {
			return false
		}
	}

	return true
}
