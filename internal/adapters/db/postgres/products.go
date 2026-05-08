package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"clicky-store/internal/core/domains"
)

var productColumnNames = []string{
	"id",
	"name",
	"slug",
	"description",
	"category",
	"price_cents",
	"currency",
	"dpi",
	"wireless",
	"ergonomic",
	"stock",
	"image_url",
	"created_at",
	"updated_at",
}

func productSelectColumns(prefix string) string {
	columns := make([]string, len(productColumnNames))
	for i, column := range productColumnNames {
		columns[i] = prefix + column
	}

	return strings.Join(columns, ", ")
}

func (s *Store) ListProducts(filter domains.ProductFilter) []domains.Product {
	ctx := context.Background()

	category := strings.ToLower(strings.TrimSpace(filter.Category))
	queryText := strings.ToLower(strings.TrimSpace(filter.Query))

	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)

	if category != "" {
		args = append(args, category)
		conditions = append(conditions, fmt.Sprintf("category = $%d", len(args)))
	}

	if queryText != "" {
		args = append(args, "%"+queryText+"%")
		conditions = append(
			conditions,
			fmt.Sprintf("lower(name || ' ' || description) LIKE $%d", len(args)),
		)
	}

	query := `SELECT ` + productSelectColumns("") + ` FROM products`
	if len(conditions) > 0 {
		query += ` WHERE ` + strings.Join(conditions, ` AND `)
	}
	query += ` ORDER BY name ASC`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return []domains.Product{}
	}
	defer rows.Close()

	products := make([]domains.Product, 0)
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return []domains.Product{}
		}

		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		return []domains.Product{}
	}

	if err := s.attachImages(ctx, products); err != nil {
		return []domains.Product{}
	}

	return products
}

func (s *Store) GetProduct(id string) (domains.Product, error) {
	ctx := context.Background()
	row := s.db.QueryRowContext(
		ctx,
		`SELECT `+productSelectColumns("")+` FROM products WHERE id = $1`,
		strings.TrimSpace(id),
	)

	product, err := scanProduct(row)
	if err != nil {
		return domains.Product{}, err
	}

	products := []domains.Product{product}
	if err := s.attachImages(ctx, products); err != nil {
		return domains.Product{}, err
	}

	return products[0], nil
}

func (s *Store) GetProductBySlug(slug string) (domains.Product, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return domains.Product{}, domains.ErrNotFound
	}

	ctx := context.Background()
	row := s.db.QueryRowContext(
		ctx,
		`SELECT `+productSelectColumns("")+` FROM products WHERE slug = $1`,
		slug,
	)

	product, err := scanProduct(row)
	if err != nil {
		return domains.Product{}, err
	}

	products := []domains.Product{product}
	if err := s.attachImages(ctx, products); err != nil {
		return domains.Product{}, err
	}

	return products[0], nil
}

func (s *Store) CreateProduct(product domains.Product) (domains.Product, error) {
	product.ID = newID("prod")
	product.Name = strings.TrimSpace(product.Name)
	product.Slug = strings.TrimSpace(product.Slug)
	product.Description = strings.TrimSpace(product.Description)
	product.Category = strings.ToLower(strings.TrimSpace(product.Category))
	product.Currency = normalizeCurrency(product.Currency)
	product.ImageURL = strings.TrimSpace(product.ImageURL)

	if err := validateProduct(product); err != nil {
		return domains.Product{}, err
	}

	now := time.Now().UTC()
	product.CreatedAt = now
	product.UpdatedAt = now

	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.Product{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(
		ctx,
		`INSERT INTO products (
			id,
			name,
			slug,
			description,
			category,
			price_cents,
			currency,
			dpi,
			wireless,
			ergonomic,
			stock,
			image_url,
			created_at,
			updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13, $14
		)
		RETURNING `+productSelectColumns(""),
		product.ID,
		product.Name,
		product.Slug,
		product.Description,
		product.Category,
		product.PriceCents,
		product.Currency,
		product.DPI,
		product.Wireless,
		product.Ergonomic,
		product.Stock,
		product.ImageURL,
		product.CreatedAt,
		product.UpdatedAt,
	)

	createdProduct, err := scanProduct(row)
	if err != nil {
		return domains.Product{}, err
	}

	if createdProduct.ImageURL != "" {
		if err := upsertPrimaryProductImage(ctx, tx, createdProduct.ID, createdProduct.ImageURL, createdProduct.Name); err != nil {
			return domains.Product{}, err
		}
	}
	if err := syncProductImageURL(ctx, tx, createdProduct.ID); err != nil {
		return domains.Product{}, err
	}

	if err := tx.Commit(); err != nil {
		return domains.Product{}, err
	}

	return s.GetProduct(createdProduct.ID)
}

func (s *Store) UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error) {
	product, err := s.GetProduct(id)
	if err != nil {
		return domains.Product{}, err
	}

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
		product.Currency = normalizeCurrency(*update.Currency)
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

	if err := validateProduct(product); err != nil {
		return domains.Product{}, err
	}

	product.UpdatedAt = time.Now().UTC()

	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.Product{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRowContext(
		ctx,
		`UPDATE products
		SET
			name = $2,
			slug = $3,
			description = $4,
			category = $5,
			price_cents = $6,
			currency = $7,
			dpi = $8,
			wireless = $9,
			ergonomic = $10,
			stock = $11,
			image_url = $12,
			updated_at = $13
		WHERE id = $1
		RETURNING `+productSelectColumns(""),
		product.ID,
		product.Name,
		product.Slug,
		product.Description,
		product.Category,
		product.PriceCents,
		product.Currency,
		product.DPI,
		product.Wireless,
		product.Ergonomic,
		product.Stock,
		product.ImageURL,
		product.UpdatedAt,
	)

	updatedProduct, err := scanProduct(row)
	if err != nil {
		return domains.Product{}, err
	}

	if update.ImageURL != nil {
		if updatedProduct.ImageURL != "" {
			if err := upsertPrimaryProductImage(ctx, tx, updatedProduct.ID, updatedProduct.ImageURL, updatedProduct.Name); err != nil {
				return domains.Product{}, err
			}
		}
		if err := syncProductImageURL(ctx, tx, updatedProduct.ID); err != nil {
			return domains.Product{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return domains.Product{}, err
	}

	return s.GetProduct(updatedProduct.ID)
}

func (s *Store) DeleteProduct(id string) error {
	result, err := s.db.ExecContext(
		context.Background(),
		`DELETE FROM products WHERE id = $1`,
		strings.TrimSpace(id),
	)
	if err != nil {
		return mapError(err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affected == 0 {
		return domains.ErrNotFound
	}

	return nil
}

func scanProduct(row scanner) (domains.Product, error) {
	var product domains.Product

	err := row.Scan(
		&product.ID,
		&product.Name,
		&product.Slug,
		&product.Description,
		&product.Category,
		&product.PriceCents,
		&product.Currency,
		&product.DPI,
		&product.Wireless,
		&product.Ergonomic,
		&product.Stock,
		&product.ImageURL,
		&product.CreatedAt,
		&product.UpdatedAt,
	)

	if err != nil {
		return domains.Product{}, mapError(err)
	}

	return product, nil
}
