package v1

import (
	"strings"

	"clicky-store/internal/core/domains"
)

type productRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Category    string `json:"category"`
	PriceCents  int    `json:"priceCents"`
	Currency    string `json:"currency"`
	DPI         int    `json:"dpi"`
	Wireless    bool   `json:"wireless"`
	Ergonomic   bool   `json:"ergonomic"`
	Stock       int    `json:"stock"`
	ImageURL    string `json:"imageUrl"`
}

func (req productRequest) toProduct() domains.Product {
	return domains.Product{
		Name:        strings.TrimSpace(req.Name),
		Slug:        strings.TrimSpace(req.Slug),
		Description: strings.TrimSpace(req.Description),
		Category:    strings.TrimSpace(req.Category),
		PriceCents:  req.PriceCents,
		Currency:    strings.TrimSpace(req.Currency),
		DPI:         req.DPI,
		Wireless:    req.Wireless,
		Ergonomic:   req.Ergonomic,
		Stock:       req.Stock,
		ImageURL:    strings.TrimSpace(req.ImageURL),
	}
}

type productUpdateRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	Category    *string `json:"category"`
	PriceCents  *int    `json:"priceCents"`
	Currency    *string `json:"currency"`
	DPI         *int    `json:"dpi"`
	Wireless    *bool   `json:"wireless"`
	Ergonomic   *bool   `json:"ergonomic"`
	Stock       *int    `json:"stock"`
	ImageURL    *string `json:"imageUrl"`
}

func (req productUpdateRequest) toProductUpdate() domains.ProductUpdate {
	return domains.ProductUpdate{
		Name:        trimStringPointer(req.Name),
		Slug:        trimStringPointer(req.Slug),
		Description: trimStringPointer(req.Description),
		Category:    trimStringPointer(req.Category),
		PriceCents:  req.PriceCents,
		Currency:    trimStringPointer(req.Currency),
		DPI:         req.DPI,
		Wireless:    req.Wireless,
		Ergonomic:   req.Ergonomic,
		Stock:       req.Stock,
		ImageURL:    trimStringPointer(req.ImageURL),
	}
}

type productImageUpdateRequest struct {
	AltText   *string `json:"altText"`
	SortOrder *int    `json:"sortOrder"`
	IsPrimary *bool   `json:"isPrimary"`
}

func (req productImageUpdateRequest) toProductImageUpdate() domains.ProductImageUpdate {
	return domains.ProductImageUpdate{
		AltText:   trimStringPointer(req.AltText),
		SortOrder: req.SortOrder,
		IsPrimary: req.IsPrimary,
	}
}

func trimStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}
