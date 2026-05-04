package store

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
	ErrInvalid    = errors.New("invalid")
	ErrEmptyCart  = errors.New("cart is empty")
	ErrOutOfStock = errors.New("product is out of stock")
)

type Product struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	PriceCents  int       `json:"priceCents"`
	Currency    string    `json:"currency"`
	DPI         int       `json:"dpi"`
	Wireless    bool      `json:"wireless"`
	Ergonomic   bool      `json:"ergonomic"`
	Stock       int       `json:"stock"`
	ImageURL    string    `json:"imageUrl"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ProductFilter struct {
	Category string
	Query    string
}

type ProductUpdate struct {
	Name        *string
	Slug        *string
	Description *string
	Category    *string
	PriceCents  *int
	Currency    *string
	DPI         *int
	Wireless    *bool
	Ergonomic   *bool
	Stock       *int
	ImageURL    *string
}

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	PasswordHash string    `json:"-"`
	PasswordSalt string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

type CartItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type CartLine struct {
	Product       Product `json:"product"`
	Quantity      int     `json:"quantity"`
	SubtotalCents int     `json:"subtotalCents"`
}

type Cart struct {
	UserID     string     `json:"userId"`
	Items      []CartLine `json:"items"`
	TotalCents int        `json:"totalCents"`
	Currency   string     `json:"currency"`
}

type OrderItem struct {
	ProductID      string `json:"productId"`
	Name           string `json:"name"`
	Quantity       int    `json:"quantity"`
	UnitPriceCents int    `json:"unitPriceCents"`
	SubtotalCents  int    `json:"subtotalCents"`
}

type Order struct {
	ID            string      `json:"id"`
	UserID        string      `json:"userId"`
	Items         []OrderItem `json:"items"`
	TotalCents    int         `json:"totalCents"`
	Currency      string      `json:"currency"`
	Status        string      `json:"status"`
	PaymentStatus string      `json:"paymentStatus"`
	PaymentMethod string      `json:"paymentMethod"`
	CreatedAt     time.Time   `json:"createdAt"`
}

type Store struct {
	mu         sync.RWMutex
	nextID     int64
	products   map[string]Product
	users      map[string]User
	emailIndex map[string]string
	carts      map[string]map[string]int
	orders     map[string]Order
}

func New() *Store {
	now := time.Now().UTC()
	s := &Store{
		products:   make(map[string]Product),
		users:      make(map[string]User),
		emailIndex: make(map[string]string),
		carts:      make(map[string]map[string]int),
		orders:     make(map[string]Order),
	}

	for _, product := range []Product{
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
		s.products[product.ID] = product
	}

	return s
}

func (s *Store) CreateUser(user User) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := normalizeEmail(user.Email)
	if email == "" {
		return User{}, ErrInvalid
	}
	if _, exists := s.emailIndex[email]; exists {
		return User{}, ErrConflict
	}

	user.ID = s.newIDLocked("usr")
	user.Email = email
	if user.Role == "" {
		user.Role = "customer"
	}
	user.CreatedAt = time.Now().UTC()

	s.users[user.ID] = user
	s.emailIndex[email] = user.ID

	return user, nil
}

func (s *Store) UserByEmail(email string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	id, ok := s.emailIndex[normalizeEmail(email)]
	if !ok {
		return User{}, ErrNotFound
	}

	return s.users[id], nil
}

func (s *Store) UserByID(id string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.users[id]
	if !ok {
		return User{}, ErrNotFound
	}

	return user, nil
}

func (s *Store) ListProducts(filter ProductFilter) []Product {
	s.mu.RLock()
	defer s.mu.RUnlock()

	category := strings.ToLower(strings.TrimSpace(filter.Category))
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	products := make([]Product, 0, len(s.products))

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

func (s *Store) GetProduct(id string) (Product, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	product, ok := s.products[id]
	if !ok {
		return Product{}, ErrNotFound
	}

	return product, nil
}

func (s *Store) CreateProduct(product Product) (Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := validateProduct(product); err != nil {
		return Product{}, err
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

func (s *Store) UpdateProduct(id string, update ProductUpdate) (Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[id]
	if !ok {
		return Product{}, ErrNotFound
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
		return Product{}, err
	}

	product.UpdatedAt = time.Now().UTC()
	s.products[id] = product

	return product, nil
}

func (s *Store) DeleteProduct(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.products[id]; !ok {
		return ErrNotFound
	}

	delete(s.products, id)
	return nil
}

func (s *Store) GetCart(userID string) Cart {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.cartLocked(userID)
}

func (s *Store) AddCartItem(userID, productID string, quantity int) (Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if quantity <= 0 {
		return Cart{}, ErrInvalid
	}

	product, ok := s.products[productID]
	if !ok {
		return Cart{}, ErrNotFound
	}

	if s.carts[userID] == nil {
		s.carts[userID] = make(map[string]int)
	}

	nextQuantity := s.carts[userID][productID] + quantity
	if nextQuantity > product.Stock {
		return Cart{}, ErrOutOfStock
	}

	s.carts[userID][productID] = nextQuantity

	return s.cartLocked(userID), nil
}

func (s *Store) SetCartItem(userID, productID string, quantity int) (Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if quantity < 0 {
		return Cart{}, ErrInvalid
	}

	product, ok := s.products[productID]
	if !ok {
		return Cart{}, ErrNotFound
	}

	if quantity > product.Stock {
		return Cart{}, ErrOutOfStock
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

func (s *Store) RemoveCartItem(userID, productID string) (Cart, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.products[productID]; !ok {
		return Cart{}, ErrNotFound
	}

	delete(s.carts[userID], productID)

	return s.cartLocked(userID), nil
}

func (s *Store) CreateOrderFromCart(userID, paymentMethod string) (Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cart := s.cartLocked(userID)
	if len(cart.Items) == 0 {
		return Order{}, ErrEmptyCart
	}

	items := make([]OrderItem, 0, len(cart.Items))
	for _, line := range cart.Items {
		product := s.products[line.Product.ID]
		if line.Quantity > product.Stock {
			return Order{}, ErrOutOfStock
		}
		product.Stock -= line.Quantity
		product.UpdatedAt = time.Now().UTC()
		s.products[product.ID] = product

		items = append(items, OrderItem{
			ProductID:      product.ID,
			Name:           product.Name,
			Quantity:       line.Quantity,
			UnitPriceCents: product.PriceCents,
			SubtotalCents:  line.SubtotalCents,
		})
	}

	order := Order{
		ID:            s.newIDLocked("ord"),
		UserID:        userID,
		Items:         items,
		TotalCents:    cart.TotalCents,
		Currency:      cart.Currency,
		Status:        "confirmed",
		PaymentStatus: "paid",
		PaymentMethod: normalizePaymentMethod(paymentMethod),
		CreatedAt:     time.Now().UTC(),
	}

	s.orders[order.ID] = order
	delete(s.carts, userID)

	return order, nil
}

func (s *Store) ListOrdersForUser(userID string) []Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]Order, 0)
	for _, order := range s.orders {
		if order.UserID == userID {
			orders = append(orders, order)
		}
	}

	sortOrders(orders)
	return orders
}

func (s *Store) ListOrders() []Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]Order, 0, len(s.orders))
	for _, order := range s.orders {
		orders = append(orders, order)
	}

	sortOrders(orders)
	return orders
}

func (s *Store) cartLocked(userID string) Cart {
	lines := make([]CartLine, 0)
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
		lines = append(lines, CartLine{
			Product:       product,
			Quantity:      quantity,
			SubtotalCents: subtotal,
		})
	}

	sort.Slice(lines, func(i, j int) bool {
		return lines[i].Product.Name < lines[j].Product.Name
	})

	return Cart{
		UserID:     userID,
		Items:      lines,
		TotalCents: total,
		Currency:   currency,
	}
}

func (s *Store) newIDLocked(prefix string) string {
	s.nextID++
	return fmt.Sprintf("%s_%06d", prefix, s.nextID)
}

func validateProduct(product Product) error {
	if strings.TrimSpace(product.Name) == "" ||
		strings.TrimSpace(product.Slug) == "" ||
		strings.TrimSpace(product.Description) == "" ||
		strings.TrimSpace(product.Category) == "" ||
		product.PriceCents <= 0 ||
		product.DPI <= 0 ||
		product.Stock < 0 {
		return ErrInvalid
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

func normalizePaymentMethod(method string) string {
	method = strings.ToLower(strings.TrimSpace(method))
	if method == "" {
		return "simulation"
	}
	return method
}

func sortOrders(orders []Order) {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].CreatedAt.After(orders[j].CreatedAt)
	})
}
