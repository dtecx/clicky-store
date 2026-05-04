package db

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"clicky-store/internal/core/domains"
)

type MemoryStore struct {
	mu         sync.RWMutex
	nextID     int64
	products   map[string]domains.Product
	users      map[string]domains.User
	emailIndex map[string]string
	carts      map[string]map[string]int
	orders     map[string]domains.Order
}

func NewMemoryStore() *MemoryStore {
	now := time.Now().UTC()
	store := &MemoryStore{
		products:   make(map[string]domains.Product),
		users:      make(map[string]domains.User),
		emailIndex: make(map[string]string),
		carts:      make(map[string]map[string]int),
		orders:     make(map[string]domains.Order),
	}

	for _, product := range []domains.Product{
		{
			ID:          "prod-gaming-viper",
			Name:        "Viper X1 Gaming Mouse",
			Slug:        "viper-x1-gaming-mouse",
			Description: "Lightweight wired mouse with a 26K DPI sensor and crisp switches for FPS games.",
			Category:    "gaming",
			PriceCents:  24900,
			Currency:    "PLN",
			DPI:         26000,
			Wireless:    false,
			Ergonomic:   false,
			Stock:       18,
			ImageURL:    "/assets/products/viper-x1.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "prod-gaming-orbit",
			Name:        "Orbit Pro Wireless",
			Slug:        "orbit-pro-wireless",
			Description: "Low-latency wireless mouse with programmable buttons and RGB profile support.",
			Category:    "gaming",
			PriceCents:  34900,
			Currency:    "PLN",
			DPI:         30000,
			Wireless:    true,
			Ergonomic:   true,
			Stock:       12,
			ImageURL:    "/assets/products/orbit-pro.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "prod-office-quiet",
			Name:        "QuietDesk M2",
			Slug:        "quietdesk-m2",
			Description: "Silent wireless office mouse with long battery life and a comfortable palm shape.",
			Category:    "office",
			PriceCents:  12900,
			Currency:    "PLN",
			DPI:         4000,
			Wireless:    true,
			Ergonomic:   true,
			Stock:       30,
			ImageURL:    "/assets/products/quietdesk-m2.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "prod-office-travel",
			Name:        "TravelClick Compact",
			Slug:        "travelclick-compact",
			Description: "Compact Bluetooth mouse for office work, travel, and hybrid setups.",
			Category:    "office",
			PriceCents:  9900,
			Currency:    "PLN",
			DPI:         2400,
			Wireless:    true,
			Ergonomic:   false,
			Stock:       25,
			ImageURL:    "/assets/products/travelclick.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	} {
		store.products[product.ID] = product
	}

	return store
}

func (s *MemoryStore) CreateUser(user domains.User) (domains.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := normalizeEmail(user.Email)
	role := normalizeRole(user.Role)
	if email == "" || role == "" {
		return domains.User{}, domains.ErrInvalid
	}
	if _, exists := s.emailIndex[email]; exists {
		return domains.User{}, domains.ErrConflict
	}

	user.ID = s.newIDLocked("usr")
	user.Email = email
	user.Role = role
	user.CreatedAt = time.Now().UTC()

	s.users[user.ID] = user
	s.emailIndex[email] = user.ID

	return user, nil
}

func (s *MemoryStore) ListUsers(filter domains.UserFilter) []domains.User {
	s.mu.RLock()
	defer s.mu.RUnlock()

	role := strings.ToLower(strings.TrimSpace(filter.Role))
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	users := make([]domains.User, 0, len(s.users))

	if role != "" && normalizeRole(role) == "" {
		return users
	}

	for _, user := range s.users {
		if role != "" && user.Role != role {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(user.Name+" "+user.Email+" "+user.ID), query) {
			continue
		}
		users = append(users, user)
	}

	sort.Slice(users, func(i, j int) bool {
		return users[i].Email < users[j].Email
	})

	return users
}

func (s *MemoryStore) UserByEmail(email string) (domains.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	id, ok := s.emailIndex[normalizeEmail(email)]
	if !ok {
		return domains.User{}, domains.ErrNotFound
	}

	return s.users[id], nil
}

func (s *MemoryStore) UserByID(id string) (domains.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.users[id]
	if !ok {
		return domains.User{}, domains.ErrNotFound
	}

	return user, nil
}

func (s *MemoryStore) UpdateUserRole(id, role string) (domains.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, ok := s.users[id]
	if !ok {
		return domains.User{}, domains.ErrNotFound
	}

	role = normalizeRole(role)
	if role == "" {
		return domains.User{}, domains.ErrInvalid
	}

	user.Role = role
	s.users[id] = user

	return user, nil
}

func (s *MemoryStore) ListProducts(filter domains.ProductFilter) []domains.Product {
	s.mu.RLock()
	defer s.mu.RUnlock()

	category := strings.ToLower(strings.TrimSpace(filter.Category))
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	products := make([]domains.Product, 0, len(s.products))

	for _, product := range s.products {
		if category != "" && product.Category != category {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(product.Name+" "+product.Description), query) {
			continue
		}
		products = append(products, product)
	}

	sort.Slice(products, func(i, j int) bool {
		return products[i].Name < products[j].Name
	})

	return products
}

func (s *MemoryStore) GetProduct(id string) (domains.Product, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	product, ok := s.products[id]
	if !ok {
		return domains.Product{}, domains.ErrNotFound
	}

	return product, nil
}

func (s *MemoryStore) CreateProduct(product domains.Product) (domains.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := validateProduct(product); err != nil {
		return domains.Product{}, err
	}

	now := time.Now().UTC()
	product.ID = s.newIDLocked("prod")
	product.Category = strings.ToLower(strings.TrimSpace(product.Category))
	product.Currency = normalizeCurrency(product.Currency)
	product.CreatedAt = now
	product.UpdatedAt = now
	s.products[product.ID] = product

	return product, nil
}

func (s *MemoryStore) UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[id]
	if !ok {
		return domains.Product{}, domains.ErrNotFound
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
	s.products[id] = product

	return product, nil
}

func (s *MemoryStore) DeleteProduct(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.products[id]; !ok {
		return domains.ErrNotFound
	}

	delete(s.products, id)
	return nil
}

func (s *MemoryStore) GetCart(userID string) domains.Cart {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.cartLocked(userID)
}

func (s *MemoryStore) AddCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if quantity <= 0 {
		return domains.Cart{}, domains.ErrInvalid
	}

	product, ok := s.products[productID]
	if !ok {
		return domains.Cart{}, domains.ErrNotFound
	}

	if s.carts[userID] == nil {
		s.carts[userID] = make(map[string]int)
	}

	nextQuantity := s.carts[userID][productID] + quantity
	if nextQuantity > product.Stock {
		return domains.Cart{}, domains.ErrOutOfStock
	}

	s.carts[userID][productID] = nextQuantity

	return s.cartLocked(userID), nil
}

func (s *MemoryStore) SetCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if quantity < 0 {
		return domains.Cart{}, domains.ErrInvalid
	}

	product, ok := s.products[productID]
	if !ok {
		return domains.Cart{}, domains.ErrNotFound
	}

	if quantity > product.Stock {
		return domains.Cart{}, domains.ErrOutOfStock
	}

	if quantity == 0 {
		delete(s.carts[userID], productID)
		return s.cartLocked(userID), nil
	}

	if s.carts[userID] == nil {
		s.carts[userID] = make(map[string]int)
	}
	s.carts[userID][productID] = quantity

	return s.cartLocked(userID), nil
}

func (s *MemoryStore) RemoveCartItem(userID, productID string) (domains.Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.products[productID]; !ok {
		return domains.Cart{}, domains.ErrNotFound
	}

	delete(s.carts[userID], productID)

	return s.cartLocked(userID), nil
}

func (s *MemoryStore) CreateOrderFromCart(userID, paymentMethod string) (domains.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cart := s.cartLocked(userID)
	if len(cart.Items) == 0 {
		return domains.Order{}, domains.ErrEmptyCart
	}

	items := make([]domains.OrderItem, 0, len(cart.Items))
	for _, line := range cart.Items {
		product := s.products[line.Product.ID]
		if line.Quantity > product.Stock {
			return domains.Order{}, domains.ErrOutOfStock
		}
		product.Stock -= line.Quantity
		product.UpdatedAt = time.Now().UTC()
		s.products[product.ID] = product

		items = append(items, domains.OrderItem{
			ProductID:      product.ID,
			Name:           product.Name,
			Quantity:       line.Quantity,
			UnitPriceCents: product.PriceCents,
			SubtotalCents:  line.SubtotalCents,
		})
	}

	order := domains.Order{
		ID:            s.newIDLocked("ord"),
		UserID:        userID,
		Items:         items,
		TotalCents:    cart.TotalCents,
		Currency:      cart.Currency,
		Status:        domains.OrderStatusPending,
		PaymentStatus: domains.PaymentStatusPending,
		PaymentMethod: normalizePaymentMethod(paymentMethod),
		CreatedAt:     time.Now().UTC(),
	}

	s.orders[order.ID] = order
	delete(s.carts, userID)

	return order, nil
}

func (s *MemoryStore) SimulateOrderPayment(userID, orderID, result string) (domains.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, ok := s.orders[strings.TrimSpace(orderID)]
	if !ok || order.UserID != strings.TrimSpace(userID) {
		return domains.Order{}, domains.ErrNotFound
	}

	if order.Status != domains.OrderStatusPending || order.PaymentStatus != domains.PaymentStatusPending {
		return domains.Order{}, domains.ErrInvalid
	}

	switch strings.ToLower(strings.TrimSpace(result)) {
	case "success":
		order.Status = domains.OrderStatusConfirmed
		order.PaymentStatus = domains.PaymentStatusPaid
	case "failure":
		order.Status = domains.OrderStatusPaymentFailed
		order.PaymentStatus = domains.PaymentStatusFailed
	default:
		return domains.Order{}, domains.ErrInvalid
	}

	s.orders[order.ID] = order
	return order, nil
}

func (s *MemoryStore) ListOrdersForUser(userID string) []domains.Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]domains.Order, 0)
	for _, order := range s.orders {
		if order.UserID == userID {
			orders = append(orders, order)
		}
	}

	sortOrders(orders)
	return orders
}

func (s *MemoryStore) ListOrders() []domains.Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]domains.Order, 0, len(s.orders))
	for _, order := range s.orders {
		orders = append(orders, order)
	}

	sortOrders(orders)
	return orders
}

func (s *MemoryStore) cartLocked(userID string) domains.Cart {
	lines := make([]domains.CartLine, 0)
	total := 0
	currency := "PLN"

	for productID, quantity := range s.carts[userID] {
		product, ok := s.products[productID]
		if !ok {
			continue
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

	sort.Slice(lines, func(i, j int) bool {
		return lines[i].Product.Name < lines[j].Product.Name
	})

	return domains.Cart{
		UserID:     userID,
		Items:      lines,
		TotalCents: total,
		Currency:   currency,
	}
}

func (s *MemoryStore) newIDLocked(prefix string) string {
	s.nextID++
	return fmt.Sprintf("%s_%06d", prefix, s.nextID)
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

func sortOrders(orders []domains.Order) {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].CreatedAt.After(orders[j].CreatedAt)
	})
}
