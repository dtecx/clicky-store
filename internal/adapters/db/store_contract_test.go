package db_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"clicky-store/internal/adapters/db"
	"clicky-store/internal/adapters/db/postgres"
	"clicky-store/internal/core/domains"
	"clicky-store/internal/core/ports"
)

type storeFactory struct {
	name string
	open func(t *testing.T) ports.Store
}

func TestStoreContractUserProductCartOrderFlow(t *testing.T) {
	for _, factory := range storeFactories() {
		t.Run(factory.name, func(t *testing.T) {
			store := factory.open(t)
			suffix := uniqueSuffix(t)

			user := createContractUser(t, store, suffix)
			duplicateUser := domains.User{
				Name:         "Duplicate Customer",
				Email:        strings.ToUpper(user.Email),
				Role:         "customer",
				PasswordHash: "hash",
				PasswordSalt: "salt",
			}
			if _, err := store.CreateUser(duplicateUser); !errors.Is(err, domains.ErrConflict) {
				t.Fatalf("duplicate CreateUser error = %v, want conflict", err)
			}

			fetchedByEmail, err := store.UserByEmail(user.Email)
			if err != nil {
				t.Fatalf("UserByEmail: %v", err)
			}
			if fetchedByEmail.ID != user.ID {
				t.Fatalf("UserByEmail ID = %q, want %q", fetchedByEmail.ID, user.ID)
			}

			updatedUser, err := store.UpdateUserRole(user.ID, "admin")
			if err != nil {
				t.Fatalf("UpdateUserRole: %v", err)
			}
			if updatedUser.Role != "admin" {
				t.Fatalf("updated role = %q, want admin", updatedUser.Role)
			}

			filteredUsers := store.ListUsers(domains.UserFilter{Role: "admin", Query: suffix})
			if !hasUser(filteredUsers, user.ID) {
				t.Fatalf("ListUsers did not include updated user: %+v", filteredUsers)
			}

			product := createContractProduct(t, store, suffix, 5)
			updatedName := "Updated Contract Mouse " + suffix
			updatedPrice := 13500
			updatedProduct, err := store.UpdateProduct(product.ID, domains.ProductUpdate{
				Name:       &updatedName,
				PriceCents: &updatedPrice,
			})
			if err != nil {
				t.Fatalf("UpdateProduct: %v", err)
			}
			if updatedProduct.Name != updatedName || updatedProduct.PriceCents != updatedPrice {
				t.Fatalf("updated product = %+v, want updated name and price", updatedProduct)
			}

			filteredProducts := store.ListProducts(domains.ProductFilter{Category: "gaming", Query: suffix})
			if !hasProduct(filteredProducts, product.ID) {
				t.Fatalf("ListProducts did not include product: %+v", filteredProducts)
			}

			cart, err := store.AddCartItem(user.ID, product.ID, 2)
			if err != nil {
				t.Fatalf("AddCartItem: %v", err)
			}
			if len(cart.Items) != 1 || cart.Items[0].Quantity != 2 {
				t.Fatalf("cart after add = %+v, want one line with quantity 2", cart)
			}

			cart, err = store.SetCartItem(user.ID, product.ID, 3)
			if err != nil {
				t.Fatalf("SetCartItem: %v", err)
			}
			if cart.TotalCents != updatedPrice*3 {
				t.Fatalf("cart total = %d, want %d", cart.TotalCents, updatedPrice*3)
			}

			order, err := store.CreateOrderFromCart(user.ID, "simulation")
			if err != nil {
				t.Fatalf("CreateOrderFromCart: %v", err)
			}
			if order.UserID != user.ID || order.Status != "confirmed" || order.PaymentStatus != "paid" {
				t.Fatalf("order = %+v, want confirmed paid order for user", order)
			}
			if len(order.Items) != 1 || order.Items[0].Name != updatedName || order.Items[0].UnitPriceCents != updatedPrice {
				t.Fatalf("order items = %+v, want product snapshot", order.Items)
			}

			emptyCart := store.GetCart(user.ID)
			if len(emptyCart.Items) != 0 {
				t.Fatalf("cart after checkout = %+v, want empty", emptyCart.Items)
			}

			productAfterOrder, err := store.GetProduct(product.ID)
			if err != nil {
				t.Fatalf("GetProduct after order: %v", err)
			}
			if productAfterOrder.Stock != 2 {
				t.Fatalf("stock after order = %d, want 2", productAfterOrder.Stock)
			}

			if !hasOrder(store.ListOrdersForUser(user.ID), order.ID) {
				t.Fatal("ListOrdersForUser did not include created order")
			}
			if !hasOrder(store.ListOrders(), order.ID) {
				t.Fatal("ListOrders did not include created order")
			}

			if err := store.DeleteProduct(product.ID); err != nil {
				t.Fatalf("DeleteProduct: %v", err)
			}
			if _, err := store.GetProduct(product.ID); !errors.Is(err, domains.ErrNotFound) {
				t.Fatalf("GetProduct after delete error = %v, want not found", err)
			}

			ordersAfterDelete := store.ListOrdersForUser(user.ID)
			foundOrder, ok := findOrder(ordersAfterDelete, order.ID)
			if !ok || len(foundOrder.Items) != 1 || foundOrder.Items[0].Name != updatedName {
				t.Fatalf("order snapshot after product delete = %+v, want original item", foundOrder)
			}
		})
	}
}

func TestStoreContractCheckoutRollbackOnInsufficientStock(t *testing.T) {
	for _, factory := range storeFactories() {
		t.Run(factory.name, func(t *testing.T) {
			store := factory.open(t)
			suffix := uniqueSuffix(t)
			user := createContractUser(t, store, suffix)
			product := createContractProduct(t, store, suffix, 1)

			if _, err := store.AddCartItem(user.ID, product.ID, 1); err != nil {
				t.Fatalf("AddCartItem: %v", err)
			}

			zero := 0
			if _, err := store.UpdateProduct(product.ID, domains.ProductUpdate{Stock: &zero}); err != nil {
				t.Fatalf("UpdateProduct stock: %v", err)
			}

			if _, err := store.CreateOrderFromCart(user.ID, "simulation"); !errors.Is(err, domains.ErrOutOfStock) {
				t.Fatalf("CreateOrderFromCart error = %v, want out of stock", err)
			}

			cart := store.GetCart(user.ID)
			if len(cart.Items) != 1 || cart.Items[0].Quantity != 1 {
				t.Fatalf("cart after failed checkout = %+v, want original line", cart)
			}

			productAfterFailure, err := store.GetProduct(product.ID)
			if err != nil {
				t.Fatalf("GetProduct after failed checkout: %v", err)
			}
			if productAfterFailure.Stock != 0 {
				t.Fatalf("stock after failed checkout = %d, want 0", productAfterFailure.Stock)
			}
		})
	}
}

func TestStoreContractValidationErrors(t *testing.T) {
	for _, factory := range storeFactories() {
		t.Run(factory.name, func(t *testing.T) {
			store := factory.open(t)
			suffix := uniqueSuffix(t)
			user := createContractUser(t, store, suffix)

			if _, err := store.CreateProduct(domains.Product{
				Slug:        "invalid-" + suffix,
				Description: "Missing a product name.",
				Category:    "gaming",
				PriceCents:  1000,
				Currency:    "PLN",
				DPI:         1000,
				Stock:       1,
			}); !errors.Is(err, domains.ErrInvalid) {
				t.Fatalf("invalid CreateProduct error = %v, want invalid", err)
			}

			if _, err := store.CreateOrderFromCart(user.ID, "simulation"); !errors.Is(err, domains.ErrEmptyCart) {
				t.Fatalf("empty cart CreateOrderFromCart error = %v, want empty cart", err)
			}

			product := createContractProduct(t, store, suffix, 1)
			if _, err := store.AddCartItem(user.ID, product.ID, 0); !errors.Is(err, domains.ErrInvalid) {
				t.Fatalf("zero quantity AddCartItem error = %v, want invalid", err)
			}
			if _, err := store.AddCartItem(user.ID, product.ID, 2); !errors.Is(err, domains.ErrOutOfStock) {
				t.Fatalf("overstock AddCartItem error = %v, want out of stock", err)
			}
		})
	}
}

func storeFactories() []storeFactory {
	factories := []storeFactory{
		{
			name: "memory",
			open: func(t *testing.T) ports.Store {
				t.Helper()
				return db.NewMemoryStore()
			},
		},
	}

	if databaseURL := strings.TrimSpace(os.Getenv("TEST_DATABASE_URL")); databaseURL != "" {
		factories = append(factories, storeFactory{
			name: "postgres",
			open: func(t *testing.T) ports.Store {
				t.Helper()

				store, err := postgres.New(context.Background(), databaseURL)
				if err != nil {
					t.Fatalf("open postgres store: %v", err)
				}
				t.Cleanup(func() {
					if err := store.Close(); err != nil {
						t.Fatalf("close postgres store: %v", err)
					}
				})

				return store
			},
		})
	}

	return factories
}

func createContractUser(t *testing.T, store ports.Store, suffix string) domains.User {
	t.Helper()

	user, err := store.CreateUser(domains.User{
		Name:         "Contract Customer " + suffix,
		Email:        "contract-" + suffix + "@example.com",
		Role:         "customer",
		PasswordHash: "hash",
		PasswordSalt: "salt",
	})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	return user
}

func createContractProduct(t *testing.T, store ports.Store, suffix string, stock int) domains.Product {
	t.Helper()

	product, err := store.CreateProduct(domains.Product{
		Name:        "Contract Mouse " + suffix,
		Slug:        "contract-mouse-" + suffix,
		Description: "A contract-test mouse that should behave the same in every store.",
		Category:    "gaming",
		PriceCents:  12000,
		Currency:    "PLN",
		DPI:         8000,
		Wireless:    true,
		Ergonomic:   true,
		Stock:       stock,
		ImageURL:    "/assets/products/contract.jpg",
	})
	if err != nil {
		t.Fatalf("CreateProduct: %v", err)
	}

	return product
}

func uniqueSuffix(t *testing.T) string {
	t.Helper()

	name := strings.ToLower(t.Name())
	name = strings.NewReplacer("/", "-", " ", "-", "_", "-").Replace(name)

	return fmt.Sprintf("%s-%d", name, time.Now().UTC().UnixNano())
}

func hasUser(users []domains.User, id string) bool {
	for _, user := range users {
		if user.ID == id {
			return true
		}
	}

	return false
}

func hasProduct(products []domains.Product, id string) bool {
	for _, product := range products {
		if product.ID == id {
			return true
		}
	}

	return false
}

func hasOrder(orders []domains.Order, id string) bool {
	_, ok := findOrder(orders, id)
	return ok
}

func findOrder(orders []domains.Order, id string) (domains.Order, bool) {
	for _, order := range orders {
		if order.ID == id {
			return order, true
		}
	}

	return domains.Order{}, false
}
