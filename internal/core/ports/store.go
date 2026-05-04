package ports

import "clicky-store/internal/core/domains"

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
	CreateProduct(product domains.Product) (domains.Product, error)
	UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error)
	DeleteProduct(id string) error
}

type CartStore interface {
	GetCart(userID string) domains.Cart
	AddCartItem(userID, productID string, quantity int) (domains.Cart, error)
	SetCartItem(userID, productID string, quantity int) (domains.Cart, error)
	RemoveCartItem(userID, productID string) (domains.Cart, error)
}

type OrderStore interface {
	CreateOrderFromCart(userID, paymentMethod string) (domains.Order, error)
	ListOrdersForUser(userID string) []domains.Order
	ListOrders() []domains.Order
}

type Store interface {
	UserStore
	ProductStore
	CartStore
	OrderStore
}
