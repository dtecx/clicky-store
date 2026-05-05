package v1

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"clicky-store/internal/core/domains"
	"clicky-store/internal/service"
	"clicky-store/internal/web"
)

const apiPrefix = "/api/v1"

type contextKey string

const userContextKey contextKey = "user"

type Handler struct {
	service      *service.Service
	loginLimiter *loginRateLimiter
}

func NewHandler(service *service.Service) *Handler {
	return &Handler{
		service:      service,
		loginLimiter: newLoginRateLimiter(loginRateLimitMaxFailures, loginRateLimitWindow),
	}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", h.handleRoot)
	mux.HandleFunc("/healthz", h.handleHealth)
	mux.HandleFunc(apiPrefix+"/auth/register", h.handleRegister)
	mux.HandleFunc(apiPrefix+"/auth/login", h.handleLogin)
	mux.Handle(apiPrefix+"/me", h.requireAuth(http.HandlerFunc(h.handleMe)))
	mux.HandleFunc(apiPrefix+"/products", h.handleProducts)
	mux.HandleFunc(apiPrefix+"/products/", h.handleProduct)
	mux.Handle(apiPrefix+"/cart", h.requireAuth(http.HandlerFunc(h.handleCart)))
	mux.Handle(apiPrefix+"/cart/items", h.requireAuth(http.HandlerFunc(h.handleCartItems)))
	mux.Handle(apiPrefix+"/cart/items/", h.requireAuth(http.HandlerFunc(h.handleCartItem)))
	mux.Handle(apiPrefix+"/orders", h.requireAuth(http.HandlerFunc(h.handleOrders)))
	mux.Handle(apiPrefix+"/orders/", h.requireAuth(http.HandlerFunc(h.handleOrderSubresource)))
	mux.Handle(apiPrefix+"/admin/products", h.requireAdmin(http.HandlerFunc(h.handleAdminProducts)))
	mux.Handle(apiPrefix+"/admin/products/", h.requireAdmin(http.HandlerFunc(h.handleAdminProduct)))
	mux.Handle(apiPrefix+"/admin/orders", h.requireAdmin(http.HandlerFunc(h.handleAdminOrders)))
	mux.Handle(apiPrefix+"/admin/users", h.requireAdmin(http.HandlerFunc(h.handleAdminUsers)))
	mux.Handle(apiPrefix+"/admin/users/", h.requireAdmin(http.HandlerFunc(h.handleAdminUser)))

	return mux
}

func (h *Handler) handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		web.WriteError(w, http.StatusNotFound, "route not found")
		return
	}
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	web.WriteJSON(w, http.StatusOK, map[string]any{
		"name":    "Clicky-Store API",
		"version": "0.1.0",
		"routes": []string{
			"GET /healthz",
			"GET /api/v1/products",
			"POST /api/v1/auth/register",
			"POST /api/v1/auth/login",
		},
	})
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	web.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

func (h *Handler) handleProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	products := h.service.ListProducts(domains.ProductFilter{
		Category: r.URL.Query().Get("category"),
		Query:    r.URL.Query().Get("q"),
	})
	web.WriteJSON(w, http.StatusOK, map[string]any{"products": products})
}

func (h *Handler) handleProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	rest := strings.TrimPrefix(r.URL.Path, apiPrefix+"/products/")
	if rest == "" {
		web.WriteError(w, http.StatusNotFound, "product not found")
		return
	}

	if strings.HasPrefix(rest, "slug/") {
		slug := strings.TrimPrefix(rest, "slug/")
		if slug == "" || strings.Contains(slug, "/") {
			web.WriteError(w, http.StatusNotFound, "product not found")
			return
		}

		product, err := h.service.GetProductBySlug(slug)
		if err != nil {
			writeDomainError(w, err, "product not found")
			return
		}

		web.WriteJSON(w, http.StatusOK, map[string]any{"product": product})
		return
	}

	if strings.Contains(rest, "/") {
		web.WriteError(w, http.StatusNotFound, "product not found")
		return
	}

	product, err := h.service.GetProduct(rest)
	if err != nil {
		writeDomainError(w, err, "product not found")
		return
	}

	web.WriteJSON(w, http.StatusOK, map[string]any{"product": product})
}

func (h *Handler) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := web.ReadJSON(r, &req); err != nil {
		web.WriteError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || !strings.Contains(req.Email, "@") || len(req.Password) < 8 {
		web.WriteError(w, http.StatusBadRequest, "name, valid email, and password with at least 8 characters are required")
		return
	}

	user, token, err := h.service.RegisterUser(req.Name, req.Email, req.Password)
	if err != nil {
		writeDomainError(w, err, "could not create user")
		return
	}

	web.WriteJSON(w, http.StatusCreated, map[string]any{"user": user, "token": token})
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := web.ReadJSON(r, &req); err != nil {
		web.WriteError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	email := domains.NormalizeEmail(req.Email)
	limitKey := loginRateLimitKey(r, email)
	if h.loginLimiter.blocked(limitKey) {
		web.WriteError(w, http.StatusTooManyRequests, "too many login attempts; try again later")
		return
	}

	user, token, err := h.service.Login(email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			h.loginLimiter.recordFailure(limitKey)
			web.WriteError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		writeDomainError(w, err, "could not login")
		return
	}

	h.loginLimiter.reset(limitKey)
	web.WriteJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	web.WriteJSON(w, http.StatusOK, map[string]any{"user": currentUser(r)})
}

func (h *Handler) handleCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cart := h.service.GetCart(currentUser(r).ID)
	web.WriteJSON(w, http.StatusOK, map[string]any{"cart": cart})
}

func (h *Handler) handleCartItems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	}
	if err := web.ReadJSON(r, &req); err != nil {
		web.WriteError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	cart, err := h.service.AddCartItem(currentUser(r).ID, req.ProductID, req.Quantity)
	if err != nil {
		writeDomainError(w, err, "could not add item to cart")
		return
	}

	web.WriteJSON(w, http.StatusCreated, map[string]any{"cart": cart})
}

func (h *Handler) handleCartItem(w http.ResponseWriter, r *http.Request) {
	productID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/cart/items/")
	if productID == "" || strings.Contains(productID, "/") {
		web.WriteError(w, http.StatusNotFound, "cart item not found")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		var req struct {
			Quantity int `json:"quantity"`
		}
		if err := web.ReadJSON(r, &req); err != nil {
			web.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		cart, err := h.service.SetCartItem(currentUser(r).ID, productID, req.Quantity)
		if err != nil {
			writeDomainError(w, err, "could not update cart item")
			return
		}
		web.WriteJSON(w, http.StatusOK, map[string]any{"cart": cart})
	case http.MethodDelete:
		cart, err := h.service.RemoveCartItem(currentUser(r).ID, productID)
		if err != nil {
			writeDomainError(w, err, "could not remove cart item")
			return
		}
		web.WriteJSON(w, http.StatusOK, map[string]any{"cart": cart})
	default:
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) handleOrders(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	switch r.Method {
	case http.MethodGet:
		orders := h.service.ListOrdersForUser(user.ID)
		web.WriteJSON(w, http.StatusOK, map[string]any{"orders": orders})
	case http.MethodPost:
		var req struct {
			PaymentMethod string `json:"paymentMethod"`
		}
		if err := web.ReadJSON(r, &req); err != nil {
			web.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		order, err := h.service.CreateOrderFromCart(user.ID, req.PaymentMethod)
		if err != nil {
			writeDomainError(w, err, "could not create order")
			return
		}
		web.WriteJSON(w, http.StatusCreated, map[string]any{"order": order})
	default:
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) handleOrderSubresource(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	suffix := strings.TrimPrefix(r.URL.Path, apiPrefix+"/orders/")
	parts := strings.Split(suffix, "/")
	if len(parts) != 3 || parts[0] == "" || parts[1] != "payment" || parts[2] != "simulate" {
		web.WriteError(w, http.StatusNotFound, "order route not found")
		return
	}

	var req struct {
		Result string `json:"result"`
	}
	if err := web.ReadJSON(r, &req); err != nil {
		web.WriteError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	order, err := h.service.SimulateOrderPayment(currentUser(r).ID, parts[0], req.Result)
	if err != nil {
		writeDomainError(w, err, "could not simulate payment")
		return
	}

	web.WriteJSON(w, http.StatusOK, map[string]any{"order": order})
}

func (h *Handler) handleAdminProducts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		products := h.service.ListProducts(domains.ProductFilter{
			Category: r.URL.Query().Get("category"),
			Query:    r.URL.Query().Get("q"),
		})
		web.WriteJSON(w, http.StatusOK, map[string]any{"products": products})
	case http.MethodPost:
		var req productRequest
		if err := web.ReadJSON(r, &req); err != nil {
			web.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		product, err := h.service.CreateProduct(req.toProduct())
		if err != nil {
			writeDomainError(w, err, "could not create product")
			return
		}
		web.WriteJSON(w, http.StatusCreated, map[string]any{"product": product})
	default:
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) handleAdminProduct(w http.ResponseWriter, r *http.Request) {
	productID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/admin/products/")
	if productID == "" || strings.Contains(productID, "/") {
		web.WriteError(w, http.StatusNotFound, "product not found")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		var req productUpdateRequest
		if err := web.ReadJSON(r, &req); err != nil {
			web.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		product, err := h.service.UpdateProduct(productID, req.toProductUpdate())
		if err != nil {
			writeDomainError(w, err, "could not update product")
			return
		}
		web.WriteJSON(w, http.StatusOK, map[string]any{"product": product})
	case http.MethodDelete:
		err := h.service.DeleteProduct(productID)
		if err != nil {
			writeDomainError(w, err, "could not delete product")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) handleAdminOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	orders := h.service.ListOrders()
	web.WriteJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (h *Handler) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	users := h.service.ListUsers(domains.UserFilter{
		Role:  r.URL.Query().Get("role"),
		Query: r.URL.Query().Get("q"),
	})
	web.WriteJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *Handler) handleAdminUser(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/admin/users/")
	if userID == "" || strings.Contains(userID, "/") {
		web.WriteError(w, http.StatusNotFound, "user not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		user, err := h.service.GetUser(userID)
		if err != nil {
			writeDomainError(w, err, "user not found")
			return
		}
		web.WriteJSON(w, http.StatusOK, map[string]any{"user": user})
	case http.MethodPatch:
		var req struct {
			Role string `json:"role"`
		}
		if err := web.ReadJSON(r, &req); err != nil {
			web.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		user, err := h.service.UpdateUserRole(userID, req.Role)
		if err != nil {
			writeDomainError(w, err, "could not update user")
			return
		}
		web.WriteJSON(w, http.StatusOK, map[string]any{"user": user})
	default:
		web.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := h.userFromRequest(r)
		if err != nil {
			web.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) requireAdmin(next http.Handler) http.Handler {
	return h.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := currentUser(r)
		if user.Role != "admin" {
			web.WriteError(w, http.StatusForbidden, "admin role required")
			return
		}

		next.ServeHTTP(w, r)
	}))
}

func (h *Handler) userFromRequest(r *http.Request) (domains.User, error) {
	header := r.Header.Get("Authorization")
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == "" || token == header {
		return domains.User{}, errors.New("missing bearer token")
	}

	return h.service.UserFromToken(token)
}

func currentUser(r *http.Request) domains.User {
	user, _ := r.Context().Value(userContextKey).(domains.User)
	return user
}

func writeDomainError(w http.ResponseWriter, err error, fallback string) {
	switch {
	case errors.Is(err, domains.ErrNotFound):
		web.WriteError(w, http.StatusNotFound, fallback)
	case errors.Is(err, domains.ErrConflict):
		web.WriteError(w, http.StatusConflict, "resource already exists")
	case errors.Is(err, domains.ErrInvalid):
		web.WriteError(w, http.StatusBadRequest, "invalid request data")
	case errors.Is(err, domains.ErrEmptyCart):
		web.WriteError(w, http.StatusBadRequest, "cart is empty")
	case errors.Is(err, domains.ErrOutOfStock):
		web.WriteError(w, http.StatusConflict, "requested quantity is not available")
	default:
		web.WriteError(w, http.StatusInternalServerError, fallback)
	}
}
