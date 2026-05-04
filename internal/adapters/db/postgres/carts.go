package postgres

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"clicky-store/internal/core/domains"
)

func (s *Store) GetCart(userID string) domains.Cart {
	cart, err := s.cart(context.Background(), userID)
	if err != nil {
		return domains.Cart{
			UserID:   strings.TrimSpace(userID),
			Items:    []domains.CartLine{},
			Currency: "PLN",
		}
	}

	return cart
}

func (s *Store) AddCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	if quantity <= 0 {
		return domains.Cart{}, domains.ErrInvalid
	}

	ctx := context.Background()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.Cart{}, err
	}
	defer tx.Rollback()

	product, err := productByIDForUpdate(ctx, tx, productID)
	if err != nil {
		return domains.Cart{}, err
	}

	currentQuantity := 0
	err = tx.QueryRowContext(
		ctx,
		`SELECT quantity
		FROM carts
		WHERE user_id = $1 AND product_id = $2
		FOR UPDATE`,
		strings.TrimSpace(userID),
		strings.TrimSpace(productID),
	).Scan(&currentQuantity)

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domains.Cart{}, mapError(err)
	}

	nextQuantity := currentQuantity + quantity
	if nextQuantity > product.Stock {
		return domains.Cart{}, domains.ErrOutOfStock
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO carts (user_id, product_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, product_id)
		DO UPDATE SET quantity = EXCLUDED.quantity`,
		strings.TrimSpace(userID),
		strings.TrimSpace(productID),
		nextQuantity,
	); err != nil {
		return domains.Cart{}, mapError(err)
	}

	if err := tx.Commit(); err != nil {
		return domains.Cart{}, err
	}

	return s.cart(ctx, userID)
}

func (s *Store) SetCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	if quantity < 0 {
		return domains.Cart{}, domains.ErrInvalid
	}

	ctx := context.Background()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.Cart{}, err
	}
	defer tx.Rollback()

	product, err := productByIDForUpdate(ctx, tx, productID)
	if err != nil {
		return domains.Cart{}, err
	}

	if quantity > product.Stock {
		return domains.Cart{}, domains.ErrOutOfStock
	}

	if quantity == 0 {
		if _, err := tx.ExecContext(
			ctx,
			`DELETE FROM carts WHERE user_id = $1 AND product_id = $2`,
			strings.TrimSpace(userID),
			strings.TrimSpace(productID),
		); err != nil {
			return domains.Cart{}, mapError(err)
		}

		if err := tx.Commit(); err != nil {
			return domains.Cart{}, err
		}

		return s.cart(ctx, userID)
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO carts (user_id, product_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, product_id)
		DO UPDATE SET quantity = EXCLUDED.quantity`,
		strings.TrimSpace(userID),
		strings.TrimSpace(productID),
		quantity,
	); err != nil {
		return domains.Cart{}, mapError(err)
	}

	if err := tx.Commit(); err != nil {
		return domains.Cart{}, err
	}

	return s.cart(ctx, userID)
}

func (s *Store) RemoveCartItem(userID, productID string) (domains.Cart, error) {
	ctx := context.Background()

	if _, err := s.GetProduct(productID); err != nil {
		return domains.Cart{}, err
	}

	if _, err := s.db.ExecContext(
		ctx,
		`DELETE FROM carts WHERE user_id = $1 AND product_id = $2`,
		strings.TrimSpace(userID),
		strings.TrimSpace(productID),
	); err != nil {
		return domains.Cart{}, mapError(err)
	}

	return s.cart(ctx, userID)
}

func (s *Store) cart(ctx context.Context, userID string) (domains.Cart, error) {
	userID = strings.TrimSpace(userID)

	rows, err := s.db.QueryContext(
		ctx,
		`SELECT `+productSelectColumns("p.")+`, c.quantity
		FROM carts c
		JOIN products p ON p.id = c.product_id
		WHERE c.user_id = $1
		ORDER BY p.name ASC`,
		userID,
	)
	if err != nil {
		return domains.Cart{}, mapError(err)
	}
	defer rows.Close()

	lines := make([]domains.CartLine, 0)
	total := 0
	currency := "PLN"

	for rows.Next() {
		var product domains.Product
		var quantity int

		if err := rows.Scan(
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
			&quantity,
		); err != nil {
			return domains.Cart{}, mapError(err)
		}

		subtotal := product.PriceCents * quantity
		total += subtotal
		currency = product.Currency

		lines = append(lines, domains.CartLine{
			Product:       product,
			Quantity:      quantity,
			SubtotalCents: subtotal,
		})
	}

	if err := rows.Err(); err != nil {
		return domains.Cart{}, err
	}

	return domains.Cart{
		UserID:     userID,
		Items:      lines,
		TotalCents: total,
		Currency:   currency,
	}, nil
}

func productByIDForUpdate(ctx context.Context, tx *sql.Tx, productID string) (domains.Product, error) {
	row := tx.QueryRowContext(
		ctx,
		`SELECT `+productSelectColumns("")+`
		FROM products
		WHERE id = $1
		FOR UPDATE`,
		strings.TrimSpace(productID),
	)

	return scanProduct(row)
}
