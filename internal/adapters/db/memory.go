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
			ImageURL:    "/assets/products/viper-x1.svg",
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
			ImageURL:    "/assets/products/orbit-pro.svg",
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
			ImageURL:    "/assets/products/quietdesk-m2.svg",
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
			ImageURL:    "/assets/products/travelclick.svg",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	} {
		product.Images = seedProductImages(product)
		store.products[product.ID] = product
	}

	return store
}

func (s *MemoryStore) CreateUser(user domains.User) (domains.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := domains.NormalizeEmail(user.Email)
	role := domains.NormalizeRole(user.Role)
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

	if role != "" && domains.NormalizeRole(role) == "" {
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

	id, ok := s.emailIndex[domains.NormalizeEmail(email)]
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

	role = domains.NormalizeRole(role)
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
		products = append(products, cloneProduct(product))
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

	return cloneProduct(product), nil
}

func (s *MemoryStore) GetProductBySlug(slug string) (domains.Product, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slug = strings.TrimSpace(slug)
	if slug == "" {
		return domains.Product{}, domains.ErrNotFound
	}

	for _, product := range s.products {
		if product.Slug == slug {
			return cloneProduct(product), nil
		}
	}

	return domains.Product{}, domains.ErrNotFound
}

func (s *MemoryStore) CreateProduct(product domains.Product) (domains.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product = domains.NormalizeProduct(product)
	if err := domains.ValidateProduct(product); err != nil {
		return domains.Product{}, err
	}

	now := time.Now().UTC()
	product.ID = s.newIDLocked("prod")
	product.CreatedAt = now
	product.UpdatedAt = now
	product.Images = nil
	if product.ImageURL != "" {
		s.upsertPrimaryProductImageLocked(&product)
	}
	normalizeProductImagesLocked(&product)
	s.products[product.ID] = product

	return cloneProduct(product), nil
}

func (s *MemoryStore) UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[id]
	if !ok {
		return domains.Product{}, domains.ErrNotFound
	}

	product = domains.ApplyProductUpdate(product, update)
	if err := domains.ValidateProduct(product); err != nil {
		return domains.Product{}, err
	}

	if update.ImageURL != nil && product.ImageURL != "" {
		s.upsertPrimaryProductImageLocked(&product)
	}
	normalizeProductImagesLocked(&product)
	product.UpdatedAt = time.Now().UTC()
	s.products[id] = product

	return cloneProduct(product), nil
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

func (s *MemoryStore) ListProductImages(productID string) ([]domains.ProductImage, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	product, ok := s.products[strings.TrimSpace(productID)]
	if !ok {
		return nil, domains.ErrNotFound
	}

	return copyProductImages(product.Images), nil
}

func (s *MemoryStore) CreateProductImages(productID string, images []domains.ProductImage) ([]domains.ProductImage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[strings.TrimSpace(productID)]
	if !ok {
		return nil, domains.ErrNotFound
	}
	if len(images) == 0 {
		return copyProductImages(product.Images), nil
	}

	now := time.Now().UTC()
	nextSortOrder := nextProductImageSortOrder(product.Images)
	primaryImageID := ""

	for _, image := range images {
		image = domains.NormalizeProductImage(image)
		image.ID = s.newIDLocked("img")
		image.ProductID = product.ID
		if image.AltText == "" {
			image.AltText = product.Name
		}
		image.SortOrder = nextSortOrder
		image.CreatedAt = now

		if err := domains.ValidateProductImage(image); err != nil {
			return nil, err
		}

		if image.IsPrimary && primaryImageID == "" {
			primaryImageID = image.ID
		}
		image.IsPrimary = false

		product.Images = append(product.Images, image)
		nextSortOrder++
	}

	if primaryImageID == "" && len(product.Images) == len(images) {
		primaryImageID = product.Images[0].ID
	}
	if primaryImageID != "" {
		setPrimaryProductImageLocked(&product, primaryImageID)
	}

	normalizeProductImagesLocked(&product)
	product.UpdatedAt = now
	s.products[product.ID] = product

	return copyProductImages(product.Images), nil
}

func (s *MemoryStore) UpdateProductImage(productID, imageID string, update domains.ProductImageUpdate) (domains.ProductImage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[strings.TrimSpace(productID)]
	if !ok {
		return domains.ProductImage{}, domains.ErrNotFound
	}

	imageID = strings.TrimSpace(imageID)
	imageIndex := -1
	for i, image := range product.Images {
		if image.ID == imageID {
			imageIndex = i
			break
		}
	}
	if imageIndex == -1 {
		return domains.ProductImage{}, domains.ErrNotFound
	}

	image := domains.ApplyProductImageUpdate(product.Images[imageIndex], update)
	image = domains.NormalizeProductImage(image)
	image.ID = imageID
	image.ProductID = product.ID
	if err := domains.ValidateProductImage(image); err != nil {
		return domains.ProductImage{}, err
	}

	product.Images[imageIndex] = image
	if update.IsPrimary != nil && *update.IsPrimary {
		setPrimaryProductImageLocked(&product, image.ID)
	}

	normalizeProductImagesLocked(&product)
	product.UpdatedAt = time.Now().UTC()
	s.products[product.ID] = product

	for _, updatedImage := range product.Images {
		if updatedImage.ID == imageID {
			return updatedImage, nil
		}
	}

	return domains.ProductImage{}, domains.ErrNotFound
}

func (s *MemoryStore) ReorderProductImages(productID string, imageIDs []string) ([]domains.ProductImage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[strings.TrimSpace(productID)]
	if !ok {
		return nil, domains.ErrNotFound
	}
	if len(imageIDs) != len(product.Images) {
		return nil, domains.ErrInvalid
	}

	imageByID := make(map[string]int, len(product.Images))
	for i, image := range product.Images {
		imageByID[image.ID] = i
	}

	seen := make(map[string]bool, len(imageIDs))
	for sortOrder, id := range imageIDs {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			return nil, domains.ErrInvalid
		}
		index, ok := imageByID[id]
		if !ok {
			return nil, domains.ErrInvalid
		}

		product.Images[index].SortOrder = sortOrder
		seen[id] = true
	}

	normalizeProductImagesLocked(&product)
	product.UpdatedAt = time.Now().UTC()
	s.products[product.ID] = product

	return copyProductImages(product.Images), nil
}

func (s *MemoryStore) DeleteProductImage(productID, imageID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	product, ok := s.products[strings.TrimSpace(productID)]
	if !ok {
		return domains.ErrNotFound
	}

	imageID = strings.TrimSpace(imageID)
	nextImages := make([]domains.ProductImage, 0, len(product.Images))
	found := false
	for _, image := range product.Images {
		if image.ID == imageID {
			found = true
			continue
		}
		nextImages = append(nextImages, image)
	}
	if !found {
		return domains.ErrNotFound
	}

	product.Images = nextImages
	normalizeProductImagesLocked(&product)
	product.UpdatedAt = time.Now().UTC()
	s.products[product.ID] = product

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
		PaymentMethod: domains.NormalizePaymentMethod(paymentMethod),
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
			Product:       cloneProduct(product),
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

func (s *MemoryStore) upsertPrimaryProductImageLocked(product *domains.Product) {
	product.ImageURL = strings.TrimSpace(product.ImageURL)
	if product.ImageURL == "" {
		return
	}

	for i := range product.Images {
		if product.Images[i].IsPrimary {
			product.Images[i].URL = product.ImageURL
			product.Images[i].AltText = strings.TrimSpace(product.Images[i].AltText)
			if product.Images[i].AltText == "" {
				product.Images[i].AltText = product.Name
			}
			return
		}
	}

	product.Images = append(product.Images, domains.ProductImage{
		ID:        s.newIDLocked("img"),
		ProductID: product.ID,
		URL:       product.ImageURL,
		AltText:   product.Name,
		SortOrder: nextProductImageSortOrder(product.Images),
		IsPrimary: true,
		CreatedAt: product.CreatedAt,
	})
}

func seedProductImages(product domains.Product) []domains.ProductImage {
	if strings.TrimSpace(product.ImageURL) == "" {
		return []domains.ProductImage{}
	}

	return []domains.ProductImage{
		{
			ID:        "img-" + product.ID,
			ProductID: product.ID,
			URL:       strings.TrimSpace(product.ImageURL),
			AltText:   product.Name,
			SortOrder: 0,
			IsPrimary: true,
			CreatedAt: product.CreatedAt,
		},
	}
}

func cloneProduct(product domains.Product) domains.Product {
	product.Images = copyProductImages(product.Images)
	return product
}

func copyProductImages(images []domains.ProductImage) []domains.ProductImage {
	if len(images) == 0 {
		return []domains.ProductImage{}
	}

	copied := make([]domains.ProductImage, len(images))
	copy(copied, images)
	return copied
}

func nextProductImageSortOrder(images []domains.ProductImage) int {
	next := 0
	for _, image := range images {
		if image.SortOrder >= next {
			next = image.SortOrder + 1
		}
	}

	return next
}

func setPrimaryProductImageLocked(product *domains.Product, imageID string) {
	for i := range product.Images {
		product.Images[i].IsPrimary = product.Images[i].ID == imageID
	}
}

func normalizeProductImagesLocked(product *domains.Product) {
	for i := range product.Images {
		product.Images[i] = domains.NormalizeProductImage(product.Images[i])
		product.Images[i].ProductID = product.ID
		if product.Images[i].AltText == "" {
			product.Images[i].AltText = product.Name
		}
		if product.Images[i].SortOrder < 0 {
			product.Images[i].SortOrder = 0
		}
	}

	sortProductImages(product.Images)

	primaryIndex := -1
	for i := range product.Images {
		if !product.Images[i].IsPrimary {
			continue
		}
		if primaryIndex == -1 {
			primaryIndex = i
			continue
		}
		product.Images[i].IsPrimary = false
	}

	if len(product.Images) > 0 && primaryIndex == -1 {
		primaryIndex = 0
		product.Images[primaryIndex].IsPrimary = true
	}

	if primaryIndex == -1 {
		product.ImageURL = ""
		return
	}

	product.ImageURL = product.Images[primaryIndex].URL
}

func sortProductImages(images []domains.ProductImage) {
	sort.Slice(images, func(i, j int) bool {
		if images[i].SortOrder != images[j].SortOrder {
			return images[i].SortOrder < images[j].SortOrder
		}
		if !images[i].CreatedAt.Equal(images[j].CreatedAt) {
			return images[i].CreatedAt.Before(images[j].CreatedAt)
		}
		return images[i].ID < images[j].ID
	})
}

func sortOrders(orders []domains.Order) {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].CreatedAt.After(orders[j].CreatedAt)
	})
}
