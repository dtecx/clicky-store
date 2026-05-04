package domains

import "errors"

var (
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
	ErrInvalid    = errors.New("invalid")
	ErrEmptyCart  = errors.New("cart is empty")
	ErrOutOfStock = errors.New("product is out of stock")
)
