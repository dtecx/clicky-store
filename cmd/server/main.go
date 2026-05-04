package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"clicky-store/internal/store"
)

const apiPrefix = "/api/v1"

type contextKey string

const userContextKey contextKey = "user"

type application struct {
	store  *store.Store
	signer *tokenSigner
	logger *slog.Logger
}

type apiError struct {
	Error string `json:"error"`
}

type tokenClaims struct {
	UserID    string `json:"userId"`
	Role      string `json:"role"`
	ExpiresAt int64  `json:"expiresAt"`
}

type tokenSigner struct {
	secret []byte
}

func main() {
	port := env("PORT", "8080")
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	app := &application{
		store:  store.New(),
		signer: newTokenSigner(env("AUTH_SECRET", "clicky-store-dev-secret")),
		logger: logger,
	}

	app.seedAdmin()

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           app.routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("starting clicky-store API", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func (app *application) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", app.handleRoot)
	mux.HandleFunc("/healthz", app.handleHealth)
	mux.HandleFunc(apiPrefix+"/auth/register", app.handleRegister)
	mux.HandleFunc(apiPrefix+"/auth/login", app.handleLogin)
	mux.Handle(apiPrefix+"/me", app.requireAuth(http.HandlerFunc(app.handleMe)))
	mux.HandleFunc(apiPrefix+"/products", app.handleProducts)
	mux.HandleFunc(apiPrefix+"/products/", app.handleProduct)
	mux.Handle(apiPrefix+"/cart", app.requireAuth(http.HandlerFunc(app.handleCart)))
	mux.Handle(apiPrefix+"/cart/items", app.requireAuth(http.HandlerFunc(app.handleCartItems)))
	mux.Handle(apiPrefix+"/cart/items/", app.requireAuth(http.HandlerFunc(app.handleCartItem)))
	mux.Handle(apiPrefix+"/orders", app.requireAuth(http.HandlerFunc(app.handleOrders)))
	mux.Handle(apiPrefix+"/admin/products", app.requireAdmin(http.HandlerFunc(app.handleAdminProducts)))
	mux.Handle(apiPrefix+"/admin/products/", app.requireAdmin(http.HandlerFunc(app.handleAdminProduct)))
	mux.Handle(apiPrefix+"/admin/orders", app.requireAdmin(http.HandlerFunc(app.handleAdminOrders)))

	return app.withCORS(app.withLogging(mux))
}

func (app *application) seedAdmin() {
	passwordHash, passwordSalt, err := hashPassword("admin12345")
	if err != nil {
		app.logger.Error("admin seed failed", "error", err)
		return
	}

	_, err = app.store.CreateUser(store.User{
		Name:         "Clicky Admin",
		Email:        "admin@clicky.local",
		Role:         "admin",
		PasswordHash: passwordHash,
		PasswordSalt: passwordSalt,
	})
	if err != nil {
		app.logger.Error("admin seed failed", "error", err)
	}
}

func (app *application) handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		writeError(w, http.StatusNotFound, "route not found")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
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

func (app *application) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

func (app *application) handleProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	products := app.store.ListProducts(store.ProductFilter{
		Category: r.URL.Query().Get("category"),
		Query:    r.URL.Query().Get("q"),
	})
	writeJSON(w, http.StatusOK, map[string]any{"products": products})
}

func (app *application) handleProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	productID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/products/")
	if productID == "" || strings.Contains(productID, "/") {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}

	product, err := app.store.GetProduct(productID)
	if err != nil {
		writeStoreError(w, err, "product not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"product": product})
}

func (app *application) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || !strings.Contains(req.Email, "@") || len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "name, valid email, and password with at least 8 characters are required")
		return
	}

	passwordHash, passwordSalt, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := app.store.CreateUser(store.User{
		Name:         strings.TrimSpace(req.Name),
		Email:        req.Email,
		Role:         "customer",
		PasswordHash: passwordHash,
		PasswordSalt: passwordSalt,
	})
	if err != nil {
		writeStoreError(w, err, "could not create user")
		return
	}

	token, err := app.signer.sign(tokenClaims{
		UserID:    user.ID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"user": user, "token": token})
}

func (app *application) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	user, err := app.store.UserByEmail(req.Email)
	if err != nil || !verifyPassword(req.Password, user.PasswordSalt, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := app.signer.sign(tokenClaims{
		UserID:    user.ID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

func (app *application) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"user": currentUser(r)})
}

func (app *application) handleCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cart := app.store.GetCart(currentUser(r).ID)
	writeJSON(w, http.StatusOK, map[string]any{"cart": cart})
}

func (app *application) handleCartItems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	cart, err := app.store.AddCartItem(currentUser(r).ID, req.ProductID, req.Quantity)
	if err != nil {
		writeStoreError(w, err, "could not add item to cart")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"cart": cart})
}

func (app *application) handleCartItem(w http.ResponseWriter, r *http.Request) {
	productID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/cart/items/")
	if productID == "" || strings.Contains(productID, "/") {
		writeError(w, http.StatusNotFound, "cart item not found")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		var req struct {
			Quantity int `json:"quantity"`
		}
		if err := readJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		cart, err := app.store.SetCartItem(currentUser(r).ID, productID, req.Quantity)
		if err != nil {
			writeStoreError(w, err, "could not update cart item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"cart": cart})
	case http.MethodDelete:
		cart, err := app.store.RemoveCartItem(currentUser(r).ID, productID)
		if err != nil {
			writeStoreError(w, err, "could not remove cart item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"cart": cart})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (app *application) handleOrders(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	switch r.Method {
	case http.MethodGet:
		orders := app.store.ListOrdersForUser(user.ID)
		writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
	case http.MethodPost:
		var req struct {
			PaymentMethod string `json:"paymentMethod"`
		}
		if err := readJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		order, err := app.store.CreateOrderFromCart(user.ID, req.PaymentMethod)
		if err != nil {
			writeStoreError(w, err, "could not create order")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"order": order})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (app *application) handleAdminProducts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		products := app.store.ListProducts(store.ProductFilter{
			Category: r.URL.Query().Get("category"),
			Query:    r.URL.Query().Get("q"),
		})
		writeJSON(w, http.StatusOK, map[string]any{"products": products})
	case http.MethodPost:
		var req productRequest
		if err := readJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		product, err := app.store.CreateProduct(req.toProduct())
		if err != nil {
			writeStoreError(w, err, "could not create product")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"product": product})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (app *application) handleAdminProduct(w http.ResponseWriter, r *http.Request) {
	productID := strings.TrimPrefix(r.URL.Path, apiPrefix+"/admin/products/")
	if productID == "" || strings.Contains(productID, "/") {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		var req productUpdateRequest
		if err := readJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		product, err := app.store.UpdateProduct(productID, req.toStoreUpdate())
		if err != nil {
			writeStoreError(w, err, "could not update product")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"product": product})
	case http.MethodDelete:
		err := app.store.DeleteProduct(productID)
		if err != nil {
			writeStoreError(w, err, "could not delete product")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (app *application) handleAdminOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	orders := app.store.ListOrders()
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

func (app *application) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := app.userFromRequest(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *application) requireAdmin(next http.Handler) http.Handler {
	return app.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := currentUser(r)
		if user.Role != "admin" {
			writeError(w, http.StatusForbidden, "admin role required")
			return
		}

		next.ServeHTTP(w, r)
	}))
}

func (app *application) userFromRequest(r *http.Request) (store.User, error) {
	header := r.Header.Get("Authorization")
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == "" || token == header {
		return store.User{}, errors.New("missing bearer token")
	}

	claims, err := app.signer.verify(token)
	if err != nil {
		return store.User{}, err
	}
	if time.Now().Unix() > claims.ExpiresAt {
		return store.User{}, errors.New("token expired")
	}

	user, err := app.store.UserByID(claims.UserID)
	if err != nil {
		return store.User{}, err
	}

	return user, nil
}

func (app *application) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := env("FRONTEND_ORIGIN", "*")
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		app.logger.Info("request completed", "method", r.Method, "path", r.URL.Path, "duration", time.Since(start))
	})
}

func currentUser(r *http.Request) store.User {
	user, _ := r.Context().Value(userContextKey).(store.User)
	return user
}

type productRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Category    string `json:"category"`
	PriceCents  int    `json:"priceCents"`
	Currency    string `json:"currency"`
	DPI         int    `json:"dpi"`
	Wireless    bool   `json:"wireless"`
	Ergonomic   bool   `json:"ergonomic"`
	Stock       int    `json:"stock"`
	ImageURL    string `json:"imageUrl"`
}

func (req productRequest) toProduct() store.Product {
	return store.Product{
		Name:        strings.TrimSpace(req.Name),
		Slug:        strings.TrimSpace(req.Slug),
		Description: strings.TrimSpace(req.Description),
		Category:    strings.TrimSpace(req.Category),
		PriceCents:  req.PriceCents,
		Currency:    strings.TrimSpace(req.Currency),
		DPI:         req.DPI,
		Wireless:    req.Wireless,
		Ergonomic:   req.Ergonomic,
		Stock:       req.Stock,
		ImageURL:    strings.TrimSpace(req.ImageURL),
	}
}

type productUpdateRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	Category    *string `json:"category"`
	PriceCents  *int    `json:"priceCents"`
	Currency    *string `json:"currency"`
	DPI         *int    `json:"dpi"`
	Wireless    *bool   `json:"wireless"`
	Ergonomic   *bool   `json:"ergonomic"`
	Stock       *int    `json:"stock"`
	ImageURL    *string `json:"imageUrl"`
}

func (req productUpdateRequest) toStoreUpdate() store.ProductUpdate {
	return store.ProductUpdate{
		Name:        trimStringPointer(req.Name),
		Slug:        trimStringPointer(req.Slug),
		Description: trimStringPointer(req.Description),
		Category:    trimStringPointer(req.Category),
		PriceCents:  req.PriceCents,
		Currency:    trimStringPointer(req.Currency),
		DPI:         req.DPI,
		Wireless:    req.Wireless,
		Ergonomic:   req.Ergonomic,
		Stock:       req.Stock,
		ImageURL:    trimStringPointer(req.ImageURL),
	}
}

func trimStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func readJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, apiError{Error: message})
}

func writeStoreError(w http.ResponseWriter, err error, fallback string) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, fallback)
	case errors.Is(err, store.ErrConflict):
		writeError(w, http.StatusConflict, "resource already exists")
	case errors.Is(err, store.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid request data")
	case errors.Is(err, store.ErrEmptyCart):
		writeError(w, http.StatusBadRequest, "cart is empty")
	case errors.Is(err, store.ErrOutOfStock):
		writeError(w, http.StatusConflict, "requested quantity is not available")
	default:
		writeError(w, http.StatusInternalServerError, fallback)
	}
}

func newTokenSigner(secret string) *tokenSigner {
	return &tokenSigner{secret: []byte(secret)}
}

func (s *tokenSigner) sign(claims tokenClaims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.signature(encodedPayload)

	return encodedPayload + "." + signature, nil
}

func (s *tokenSigner) verify(token string) (tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return tokenClaims{}, errors.New("invalid token")
	}

	expected := s.signature(parts[0])
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return tokenClaims{}, errors.New("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return tokenClaims{}, err
	}

	var claims tokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return tokenClaims{}, err
	}

	return claims, nil
}

func (s *tokenSigner) signature(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func hashPassword(password string) (string, string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}

	return derivePasswordHash(password, salt), hex.EncodeToString(salt), nil
}

func verifyPassword(password, encodedSalt, expectedHash string) bool {
	salt, err := hex.DecodeString(encodedSalt)
	if err != nil {
		return false
	}

	actualHash := derivePasswordHash(password, salt)
	return hmac.Equal([]byte(actualHash), []byte(expectedHash))
}

func derivePasswordHash(password string, salt []byte) string {
	digest := []byte(password)
	for i := 0; i < 120000; i++ {
		mac := hmac.New(sha256.New, salt)
		mac.Write(digest)
		digest = mac.Sum(nil)
	}

	return hex.EncodeToString(digest)
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
