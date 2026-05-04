package postgres

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"clicky-store/internal/core/domains"
)

func (s *Store) CreateOrderFromCart(userID, paymentMethod string) (domains.Order, error) {
	ctx := context.Background()
	userID = strings.TrimSpace(userID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domains.Order{}, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(
		ctx,
		`SELECT `+productSelectColumns("p.")+`, c.quantity
		FROM carts c
		JOIN products p ON p.id = c.product_id
		WHERE c.user_id = $1
		ORDER BY p.name ASC
		FOR UPDATE OF c, p`,
		userID,
	)
	if err != nil {
		return domains.Order{}, mapError(err)
	}
	defer rows.Close()

	items := make([]domains.OrderItem, 0)
	totalCents := 0
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
			return domains.Order{}, mapError(err)
		}

		if quantity > product.Stock {
			return domains.Order{}, domains.ErrOutOfStock
		}

		subtotalCents := product.PriceCents * quantity
		totalCents += subtotalCents
		currency = product.Currency

		items = append(items, domains.OrderItem{
			ProductID:      product.ID,
			Name:           product.Name,
			Quantity:       quantity,
			UnitPriceCents: product.PriceCents,
			SubtotalCents:  subtotalCents,
		})
	}

	if err := rows.Err(); err != nil {
		return domains.Order{}, mapError(err)
	}

	if len(items) == 0 {
		return domains.Order{}, domains.ErrEmptyCart
	}

	order := domains.Order{
		ID:            newID("ord"),
		UserID:        userID,
		Items:         items,
		TotalCents:    totalCents,
		Currency:      currency,
		Status:        "confirmed",
		PaymentStatus: "paid",
		PaymentMethod: normalizePaymentMethod(paymentMethod),
		CreatedAt:     time.Now().UTC(),
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO orders (
			id,
			user_id,
			total_cents,
			currency,
			status,
			payment_status,
			payment_method,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		order.ID,
		order.UserID,
		order.TotalCents,
		order.Currency,
		order.Status,
		order.PaymentStatus,
		order.PaymentMethod,
		order.CreatedAt,
	); err != nil {
		return domains.Order{}, mapError(err)
	}

	for _, item := range order.Items {
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO order_items (
				order_id,
				product_id,
				name,
				quantity,
				unit_price_cents,
				subtotal_cents
			) VALUES ($1, $2, $3, $4, $5, $6)`,
			order.ID,
			item.ProductID,
			item.Name,
			item.Quantity,
			item.UnitPriceCents,
			item.SubtotalCents,
		); err != nil {
			return domains.Order{}, mapError(err)
		}

		result, err := tx.ExecContext(
			ctx,
			`UPDATE products
			SET stock = stock - $2,
				updated_at = $3
			WHERE id = $1`,
			item.ProductID,
			item.Quantity,
			order.CreatedAt,
		)
		if err != nil {
			return domains.Order{}, mapError(err)
		}

		affected, err := result.RowsAffected()
		if err != nil {
			return domains.Order{}, err
		}
		if affected == 0 {
			return domains.Order{}, domains.ErrNotFound
		}
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM carts WHERE user_id = $1`, order.UserID); err != nil {
		return domains.Order{}, mapError(err)
	}

	if err := tx.Commit(); err != nil {
		return domains.Order{}, err
	}

	return order, nil
}

func (s *Store) ListOrdersForUser(userID string) []domains.Order {
	orders, err := s.listOrders(
		context.Background(),
		`SELECT
			o.id,
			o.user_id,
			o.total_cents,
			o.currency,
			o.status,
			o.payment_status,
			o.payment_method,
			o.created_at,
			oi.product_id,
			oi.name,
			oi.quantity,
			oi.unit_price_cents,
			oi.subtotal_cents
		FROM orders o
		LEFT JOIN order_items oi ON oi.order_id = o.id
		WHERE o.user_id = $1
		ORDER BY o.created_at DESC, oi.name ASC`,
		strings.TrimSpace(userID),
	)
	if err != nil {
		return []domains.Order{}
	}

	return orders
}

func (s *Store) ListOrders() []domains.Order {
	orders, err := s.listOrders(
		context.Background(),
		`SELECT
			o.id,
			o.user_id,
			o.total_cents,
			o.currency,
			o.status,
			o.payment_status,
			o.payment_method,
			o.created_at,
			oi.product_id,
			oi.name,
			oi.quantity,
			oi.unit_price_cents,
			oi.subtotal_cents
		FROM orders o
		LEFT JOIN order_items oi ON oi.order_id = o.id
		ORDER BY o.created_at DESC, oi.name ASC`,
	)
	if err != nil {
		return []domains.Order{}
	}

	return orders
}

func (s *Store) listOrders(ctx context.Context, query string, args ...any) ([]domains.Order, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	orders := make([]domains.Order, 0)
	orderIndex := make(map[string]int)

	for rows.Next() {
		var order domains.Order
		var itemProductID sql.NullString
		var itemName sql.NullString
		var itemQuantity sql.NullInt64
		var itemUnitPriceCents sql.NullInt64
		var itemSubtotalCents sql.NullInt64

		if err := rows.Scan(
			&order.ID,
			&order.UserID,
			&order.TotalCents,
			&order.Currency,
			&order.Status,
			&order.PaymentStatus,
			&order.PaymentMethod,
			&order.CreatedAt,
			&itemProductID,
			&itemName,
			&itemQuantity,
			&itemUnitPriceCents,
			&itemSubtotalCents,
		); err != nil {
			return nil, mapError(err)
		}

		index, ok := orderIndex[order.ID]
		if !ok {
			order.Items = []domains.OrderItem{}
			orders = append(orders, order)
			index = len(orders) - 1
			orderIndex[order.ID] = index
		}

		if itemProductID.Valid {
			orders[index].Items = append(orders[index].Items, domains.OrderItem{
				ProductID:      itemProductID.String,
				Name:           itemName.String,
				Quantity:       int(itemQuantity.Int64),
				UnitPriceCents: int(itemUnitPriceCents.Int64),
				SubtotalCents:  int(itemSubtotalCents.Int64),
			})
		}
	}

	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}

	return orders, nil
}
