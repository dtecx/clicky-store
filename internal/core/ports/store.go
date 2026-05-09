package ports

import (
	"errors"
	"io"

	"clicky-store/internal/core/domains"
)

var (
	ErrInvalidProductUpload        = errors.New("invalid product upload")
	ErrInvalidProductImageUpload   = errors.New("invalid product image upload")
	ErrUnsupportedProductImageType = errors.New("unsupported product image type")
	ErrProductImageUploadTooLarge  = errors.New("product image upload is too large")
)

type UserStore interface {
	CreateUser(user domains.User) (domains.User, error)
	ListUsers(filter domains.UserFilter) []domains.User
	UserByEmail(email string) (domains.User, error)
	UserByID(id string) (domains.User, error)
	UpdateUserRole(id, role string) (domains.User, error)
}

type ProductStore interface {
	ListProducts(filter domains.ProductFilter) []domains.Product
	GetProduct(id string) (domains.Product, error)
	GetProductBySlug(slug string) (domains.Product, error)
	CreateProduct(product domains.Product) (domains.Product, error)
	UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error)
	DeleteProduct(id string) error
}

type ProductImageStore interface {
	ListProductImages(productID string) ([]domains.ProductImage, error)
	CreateProductImages(productID string, images []domains.ProductImage) ([]domains.ProductImage, error)
	UpdateProductImage(productID, imageID string, update domains.ProductImageUpdate) (domains.ProductImage, error)
	ReorderProductImages(productID string, imageIDs []string) ([]domains.ProductImage, error)
	DeleteProductImage(productID, imageID string) error
}

type ProductImageFile struct {
	ProductID   string
	Filename    string
	URL         string
	ContentType string
	SizeBytes   int64
	Width       int
	Height      int
}

type ProductImageFileStore interface {
	SaveProductImage(productID, originalFilename string, reader io.Reader) (ProductImageFile, error)
}

type CartStore interface {
	GetCart(userID string) domains.Cart
	AddCartItem(userID, productID string, quantity int) (domains.Cart, error)
	SetCartItem(userID, productID string, quantity int) (domains.Cart, error)
	RemoveCartItem(userID, productID string) (domains.Cart, error)
}

type OrderStore interface {
	CreateOrderFromCart(userID, paymentMethod string) (domains.Order, error)
	SimulateOrderPayment(userID, orderID, result string) (domains.Order, error)
	ListOrdersForUser(userID string) []domains.Order
	ListOrders() []domains.Order
}

type Store interface {
	UserStore
	ProductStore
	ProductImageStore
	CartStore
	OrderStore
}
