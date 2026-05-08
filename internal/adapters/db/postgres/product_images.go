package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"clicky-store/internal/core/domains"
)

var productImageColumnNames = []string{
	"id",
	"product_id",
	"url",
	"alt_text",
	"sort_order",
	"is_primary",
	"created_at",
}

func productImageSelectColumns(prefix string) string {
	columns := make([]string, len(productImageColumnNames))
	for i, column := range productImageColumnNames {
		columns[i] = prefix + column
	}

	return strings.Join(columns, ", ")
}

func (s *Store) ListProductImages(productID string) ([]domains.ProductImage, error) {
	ctx := context.Background()
	productID = strings.TrimSpace(productID)

	if err := s.ensureProductExists(ctx, productID); err != nil {
		return nil, err
	}

	return s.productImages(ctx, productID)
}

func (s *Store) CreateProductImages(productID string, images []domains.ProductImage) ([]domains.ProductImage, error) {
	ctx := context.Background()
	productID = strings.TrimSpace(productID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	productName, err := productNameForUpdate(ctx, tx, productID)
	if err != nil {
		return nil, err
	}
	if len(images) == 0 {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return s.productImages(ctx, productID)
	}

	var existingCount int
	var nextSortOrder int
	if err := tx.QueryRowContext(
		ctx,
		`SELECT COUNT(*), COALESCE(MAX(sort_order) + 1, 0)
		FROM product_images
		WHERE product_id = $1`,
		productID,
	).Scan(&existingCount, &nextSortOrder); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	prepared := make([]domains.ProductImage, 0, len(images))
	primaryImageID := ""

	for _, image := range images {
		image = domains.NormalizeProductImage(image)
		image.ID = newID("img")
		image.ProductID = productID
		if image.AltText == "" {
			image.AltText = productName
		}
		image.SortOrder = nextSortOrder + len(prepared)
		image.CreatedAt = now

		if image.IsPrimary && primaryImageID == "" {
			primaryImageID = image.ID
		}
		image.IsPrimary = false

		if err := domains.ValidateProductImage(image); err != nil {
			return nil, err
		}
		prepared = append(prepared, image)
	}

	if primaryImageID == "" && existingCount == 0 && len(prepared) > 0 {
		primaryImageID = prepared[0].ID
	}

	for _, image := range prepared {
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO product_images (
				id,
				product_id,
				url,
				alt_text,
				sort_order,
				is_primary,
				created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			image.ID,
			image.ProductID,
			image.URL,
			image.AltText,
			image.SortOrder,
			image.IsPrimary,
			image.CreatedAt,
		); err != nil {
			return nil, mapError(err)
		}
	}

	if primaryImageID != "" {
		if err := setPrimaryProductImage(ctx, tx, productID, primaryImageID); err != nil {
			return nil, err
		}
	}
	if err := syncProductImageURL(ctx, tx, productID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.productImages(ctx, productID)
}

func (s *Store) UpdateProductImage(productID, imageID string, update domains.ProductImageUpdate) (domains.ProductImage, error) {
	ctx := context.Background()
	productID = strings.TrimSpace(productID)
	imageID = strings.TrimSpace(imageID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.ProductImage{}, err
	}
	defer tx.Rollback()

	if _, err := productNameForUpdate(ctx, tx, productID); err != nil {
		return domains.ProductImage{}, err
	}

	current, err := productImageForUpdate(ctx, tx, productID, imageID)
	if err != nil {
		return domains.ProductImage{}, err
	}

	next := domains.ApplyProductImageUpdate(current, update)
	next = domains.NormalizeProductImage(next)
	next.ID = current.ID
	next.ProductID = current.ProductID
	next.CreatedAt = current.CreatedAt
	if err := domains.ValidateProductImage(next); err != nil {
		return domains.ProductImage{}, err
	}

	if update.IsPrimary != nil && *update.IsPrimary {
		if _, err := tx.ExecContext(
			ctx,
			`UPDATE product_images
			SET is_primary = false
			WHERE product_id = $1 AND id <> $2`,
			productID,
			imageID,
		); err != nil {
			return domains.ProductImage{}, mapError(err)
		}
	}

	row := tx.QueryRowContext(
		ctx,
		`UPDATE product_images
		SET
			alt_text = $3,
			sort_order = $4,
			is_primary = $5
		WHERE product_id = $1 AND id = $2
		RETURNING `+productImageSelectColumns(""),
		productID,
		imageID,
		next.AltText,
		next.SortOrder,
		next.IsPrimary,
	)

	updatedImage, err := scanProductImage(row)
	if err != nil {
		return domains.ProductImage{}, err
	}
	if err := syncProductImageURL(ctx, tx, productID); err != nil {
		return domains.ProductImage{}, err
	}

	updatedImage, err = productImageForUpdate(ctx, tx, productID, imageID)
	if err != nil {
		return domains.ProductImage{}, err
	}

	if err := tx.Commit(); err != nil {
		return domains.ProductImage{}, err
	}

	return updatedImage, nil
}

func (s *Store) ReorderProductImages(productID string, imageIDs []string) ([]domains.ProductImage, error) {
	ctx := context.Background()
	productID = strings.TrimSpace(productID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := productNameForUpdate(ctx, tx, productID); err != nil {
		return nil, err
	}

	rows, err := tx.QueryContext(
		ctx,
		`SELECT id
		FROM product_images
		WHERE product_id = $1
		FOR UPDATE`,
		productID,
	)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	existing := make(map[string]bool)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		existing[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(imageIDs) != len(existing) {
		return nil, domains.ErrInvalid
	}

	seen := make(map[string]bool, len(imageIDs))
	for sortOrder, id := range imageIDs {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] || !existing[id] {
			return nil, domains.ErrInvalid
		}
		seen[id] = true

		if _, err := tx.ExecContext(
			ctx,
			`UPDATE product_images
			SET sort_order = $3
			WHERE product_id = $1 AND id = $2`,
			productID,
			id,
			sortOrder,
		); err != nil {
			return nil, mapError(err)
		}
	}

	if err := syncProductImageURL(ctx, tx, productID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.productImages(ctx, productID)
}

func (s *Store) DeleteProductImage(productID, imageID string) error {
	ctx := context.Background()
	productID = strings.TrimSpace(productID)
	imageID = strings.TrimSpace(imageID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := productNameForUpdate(ctx, tx, productID); err != nil {
		return err
	}

	result, err := tx.ExecContext(
		ctx,
		`DELETE FROM product_images
		WHERE product_id = $1 AND id = $2`,
		productID,
		imageID,
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

	if err := syncProductImageURL(ctx, tx, productID); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) productImages(ctx context.Context, productID string) ([]domains.ProductImage, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT `+productImageSelectColumns("")+`
		FROM product_images
		WHERE product_id = $1
		ORDER BY sort_order ASC, created_at ASC, id ASC`,
		strings.TrimSpace(productID),
	)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	images := make([]domains.ProductImage, 0)
	for rows.Next() {
		image, err := scanProductImage(rows)
		if err != nil {
			return nil, err
		}
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return images, nil
}

func (s *Store) attachImages(ctx context.Context, products []domains.Product) error {
	for i := range products {
		products[i].Images = []domains.ProductImage{}
	}
	if len(products) == 0 {
		return nil
	}

	args := make([]any, 0, len(products))
	placeholders := make([]string, 0, len(products))
	productIndex := make(map[string]int, len(products))
	for i, product := range products {
		id := strings.TrimSpace(product.ID)
		if id == "" {
			continue
		}
		if _, ok := productIndex[id]; ok {
			continue
		}
		productIndex[id] = i
		args = append(args, id)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
	}
	if len(args) == 0 {
		return nil
	}

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT `+productImageSelectColumns("")+`
		FROM product_images
		WHERE product_id IN (`+strings.Join(placeholders, ", ")+`)
		ORDER BY product_id ASC, sort_order ASC, created_at ASC, id ASC`,
		args...,
	)
	if err != nil {
		return mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		image, err := scanProductImage(rows)
		if err != nil {
			return err
		}
		index, ok := productIndex[image.ProductID]
		if !ok {
			continue
		}
		products[index].Images = append(products[index].Images, image)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for i := range products {
		if primaryURL := primaryProductImageURL(products[i].Images); primaryURL != "" {
			products[i].ImageURL = primaryURL
		}
	}

	return nil
}

func (s *Store) attachImagesToCartLines(ctx context.Context, lines []domains.CartLine) error {
	if len(lines) == 0 {
		return nil
	}

	products := make([]domains.Product, len(lines))
	for i, line := range lines {
		products[i] = line.Product
	}

	if err := s.attachImages(ctx, products); err != nil {
		return err
	}

	for i := range lines {
		lines[i].Product = products[i]
	}

	return nil
}

func (s *Store) ensureProductExists(ctx context.Context, productID string) error {
	var id string
	if err := s.db.QueryRowContext(
		ctx,
		`SELECT id FROM products WHERE id = $1`,
		strings.TrimSpace(productID),
	).Scan(&id); err != nil {
		return mapError(err)
	}

	return nil
}

func productNameForUpdate(ctx context.Context, tx *sql.Tx, productID string) (string, error) {
	var name string
	if err := tx.QueryRowContext(
		ctx,
		`SELECT name
		FROM products
		WHERE id = $1
		FOR UPDATE`,
		strings.TrimSpace(productID),
	).Scan(&name); err != nil {
		return "", mapError(err)
	}

	return name, nil
}

func productImageForUpdate(ctx context.Context, tx *sql.Tx, productID, imageID string) (domains.ProductImage, error) {
	row := tx.QueryRowContext(
		ctx,
		`SELECT `+productImageSelectColumns("")+`
		FROM product_images
		WHERE product_id = $1 AND id = $2
		FOR UPDATE`,
		strings.TrimSpace(productID),
		strings.TrimSpace(imageID),
	)

	return scanProductImage(row)
}

func upsertPrimaryProductImage(ctx context.Context, tx *sql.Tx, productID, imageURL, altText string) error {
	productID = strings.TrimSpace(productID)
	imageURL = strings.TrimSpace(imageURL)
	altText = strings.TrimSpace(altText)
	if imageURL == "" {
		return nil
	}

	var imageID string
	err := tx.QueryRowContext(
		ctx,
		`SELECT id
		FROM product_images
		WHERE product_id = $1 AND is_primary
		ORDER BY sort_order ASC, created_at ASC, id ASC
		LIMIT 1`,
		productID,
	).Scan(&imageID)

	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(
			ctx,
			`SELECT id
			FROM product_images
			WHERE product_id = $1
			ORDER BY sort_order ASC, created_at ASC, id ASC
			LIMIT 1`,
			productID,
		).Scan(&imageID)
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return mapError(err)
	}

	if imageID == "" {
		var sortOrder int
		if err := tx.QueryRowContext(
			ctx,
			`SELECT COALESCE(MAX(sort_order) + 1, 0)
			FROM product_images
			WHERE product_id = $1`,
			productID,
		).Scan(&sortOrder); err != nil {
			return err
		}

		imageID = newID("img")
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO product_images (
				id,
				product_id,
				url,
				alt_text,
				sort_order,
				is_primary,
				created_at
			) VALUES ($1, $2, $3, $4, $5, true, $6)`,
			imageID,
			productID,
			imageURL,
			altText,
			sortOrder,
			time.Now().UTC(),
		); err != nil {
			return mapError(err)
		}
		return nil
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET is_primary = false
		WHERE product_id = $1 AND id <> $2`,
		productID,
		imageID,
	); err != nil {
		return mapError(err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET
			url = $3,
			alt_text = $4,
			is_primary = true
		WHERE product_id = $1 AND id = $2`,
		productID,
		imageID,
		imageURL,
		altText,
	); err != nil {
		return mapError(err)
	}

	return nil
}

func setPrimaryProductImage(ctx context.Context, tx *sql.Tx, productID, imageID string) error {
	productID = strings.TrimSpace(productID)
	imageID = strings.TrimSpace(imageID)
	if imageID == "" {
		return domains.ErrInvalid
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET is_primary = false
		WHERE product_id = $1 AND id <> $2`,
		productID,
		imageID,
	); err != nil {
		return mapError(err)
	}

	result, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET is_primary = true
		WHERE product_id = $1 AND id = $2`,
		productID,
		imageID,
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

func syncProductImageURL(ctx context.Context, tx *sql.Tx, productID string) error {
	productID = strings.TrimSpace(productID)

	var imageID string
	var imageURL string
	err := tx.QueryRowContext(
		ctx,
		`SELECT id, url
		FROM product_images
		WHERE product_id = $1
		ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
		LIMIT 1`,
		productID,
	).Scan(&imageID, &imageURL)

	if errors.Is(err, sql.ErrNoRows) {
		_, err = tx.ExecContext(
			ctx,
			`UPDATE products
			SET image_url = ''
			WHERE id = $1`,
			productID,
		)
		return mapError(err)
	}
	if err != nil {
		return mapError(err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET is_primary = false
		WHERE product_id = $1 AND id <> $2`,
		productID,
		imageID,
	); err != nil {
		return mapError(err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE product_images
		SET is_primary = true
		WHERE product_id = $1 AND id = $2`,
		productID,
		imageID,
	); err != nil {
		return mapError(err)
	}

	_, err = tx.ExecContext(
		ctx,
		`UPDATE products
		SET image_url = $2
		WHERE id = $1`,
		productID,
		imageURL,
	)
	return mapError(err)
}

func primaryProductImageURL(images []domains.ProductImage) string {
	if len(images) == 0 {
		return ""
	}

	sortedImages := make([]domains.ProductImage, len(images))
	copy(sortedImages, images)
	sort.Slice(sortedImages, func(i, j int) bool {
		if sortedImages[i].IsPrimary != sortedImages[j].IsPrimary {
			return sortedImages[i].IsPrimary
		}
		if sortedImages[i].SortOrder != sortedImages[j].SortOrder {
			return sortedImages[i].SortOrder < sortedImages[j].SortOrder
		}
		if !sortedImages[i].CreatedAt.Equal(sortedImages[j].CreatedAt) {
			return sortedImages[i].CreatedAt.Before(sortedImages[j].CreatedAt)
		}
		return sortedImages[i].ID < sortedImages[j].ID
	})

	return sortedImages[0].URL
}

func scanProductImage(row scanner) (domains.ProductImage, error) {
	var image domains.ProductImage

	err := row.Scan(
		&image.ID,
		&image.ProductID,
		&image.URL,
		&image.AltText,
		&image.SortOrder,
		&image.IsPrimary,
		&image.CreatedAt,
	)
	if err != nil {
		return domains.ProductImage{}, mapError(err)
	}

	return image, nil
}
