package service

import (
	"errors"
	"strings"
	"time"

	"clicky-store/internal/core/domains"
	"clicky-store/internal/core/ports"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type Service struct {
	store  ports.Store
	signer *tokenSigner
}

func New(store ports.Store, authSecret string) *Service {
	return &Service{
		store:  store,
		signer: newTokenSigner(authSecret),
	}
}

func (s *Service) SeedAdmin(name, email, password string) error {
	passwordHash, passwordSalt, err := hashPassword(password)
	if err != nil {
		return err
	}

	_, err = s.store.CreateUser(domains.User{
		Name:         strings.TrimSpace(name),
		Email:        email,
		Role:         "admin",
		PasswordHash: passwordHash,
		PasswordSalt: passwordSalt,
	})
	if errors.Is(err, domains.ErrConflict) {
		return nil
	}

	return err
}

func (s *Service) RegisterUser(name, email, password string) (domains.User, string, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" || !strings.Contains(email, "@") || len(password) < 8 {
		return domains.User{}, "", domains.ErrInvalid
	}

	passwordHash, passwordSalt, err := hashPassword(password)
	if err != nil {
		return domains.User{}, "", err
	}

	user, err := s.store.CreateUser(domains.User{
		Name:         name,
		Email:        email,
		Role:         "customer",
		PasswordHash: passwordHash,
		PasswordSalt: passwordSalt,
	})
	if err != nil {
		return domains.User{}, "", err
	}

	token, err := s.signer.sign(tokenClaims{
		UserID:    user.ID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		return domains.User{}, "", err
	}

	return user, token, nil
}

func (s *Service) Login(email, password string) (domains.User, string, error) {
	user, err := s.store.UserByEmail(email)
	if err != nil || !verifyPassword(password, user.PasswordSalt, user.PasswordHash) {
		return domains.User{}, "", ErrInvalidCredentials
	}

	token, err := s.signer.sign(tokenClaims{
		UserID:    user.ID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		return domains.User{}, "", err
	}

	return user, token, nil
}

func (s *Service) UserFromToken(token string) (domains.User, error) {
	claims, err := s.signer.verify(token)
	if err != nil {
		return domains.User{}, err
	}
	if time.Now().Unix() > claims.ExpiresAt {
		return domains.User{}, errors.New("token expired")
	}

	return s.store.UserByID(claims.UserID)
}

func (s *Service) ListUsers(filter domains.UserFilter) []domains.User {
	return s.store.ListUsers(filter)
}

func (s *Service) GetUser(id string) (domains.User, error) {
	return s.store.UserByID(id)
}

func (s *Service) UpdateUserRole(id, role string) (domains.User, error) {
	role = strings.ToLower(strings.TrimSpace(role))
	if role != "admin" && role != "customer" {
		return domains.User{}, domains.ErrInvalid
	}

	return s.store.UpdateUserRole(id, role)
}

func (s *Service) ListProducts(filter domains.ProductFilter) []domains.Product {
	return s.store.ListProducts(filter)
}

func (s *Service) GetProduct(id string) (domains.Product, error) {
	return s.store.GetProduct(id)
}

func (s *Service) CreateProduct(product domains.Product) (domains.Product, error) {
	return s.store.CreateProduct(product)
}

func (s *Service) UpdateProduct(id string, update domains.ProductUpdate) (domains.Product, error) {
	return s.store.UpdateProduct(id, update)
}

func (s *Service) DeleteProduct(id string) error {
	return s.store.DeleteProduct(id)
}

func (s *Service) GetCart(userID string) domains.Cart {
	return s.store.GetCart(userID)
}

func (s *Service) AddCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	return s.store.AddCartItem(userID, productID, quantity)
}

func (s *Service) SetCartItem(userID, productID string, quantity int) (domains.Cart, error) {
	return s.store.SetCartItem(userID, productID, quantity)
}

func (s *Service) RemoveCartItem(userID, productID string) (domains.Cart, error) {
	return s.store.RemoveCartItem(userID, productID)
}

func (s *Service) CreateOrderFromCart(userID, paymentMethod string) (domains.Order, error) {
	return s.store.CreateOrderFromCart(userID, paymentMethod)
}

func (s *Service) ListOrdersForUser(userID string) []domains.Order {
	return s.store.ListOrdersForUser(userID)
}

func (s *Service) ListOrders() []domains.Order {
	return s.store.ListOrders()
}
