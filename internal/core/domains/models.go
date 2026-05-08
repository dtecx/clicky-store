package domains

import "time"

type Product struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Slug        string         `json:"slug"`
	Description string         `json:"description"`
	Category    string         `json:"category"`
	PriceCents  int            `json:"priceCents"`
	Currency    string         `json:"currency"`
	DPI         int            `json:"dpi"`
	Wireless    bool           `json:"wireless"`
	Ergonomic   bool           `json:"ergonomic"`
	Stock       int            `json:"stock"`
	ImageURL    string         `json:"imageUrl"`
	Images      []ProductImage `json:"images"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

type ProductFilter struct {
	Category string
	Query    string
}

type ProductImage struct {
	ID        string    `json:"id"`
	ProductID string    `json:"productId"`
	URL       string    `json:"url"`
	AltText   string    `json:"altText"`
	SortOrder int       `json:"sortOrder"`
	IsPrimary bool      `json:"isPrimary"`
	CreatedAt time.Time `json:"createdAt"`
}

type ProductImageUpdate struct {
	AltText   *string
	SortOrder *int
	IsPrimary *bool
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

type UserFilter struct {
	Role  string
	Query string
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

const (
	OrderStatusPending       = "pending"
	OrderStatusConfirmed     = "confirmed"
	OrderStatusPaymentFailed = "payment_failed"

	PaymentStatusPending = "pending"
	PaymentStatusPaid    = "paid"
	PaymentStatusFailed  = "failed"
)
