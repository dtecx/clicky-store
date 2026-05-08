package v1_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clicky-store/internal/adapters/db"
	httpv1 "clicky-store/internal/adapters/http/v1"
	"clicky-store/internal/core/domains"
	"clicky-store/internal/service"
)

type apiTestServer struct {
	t       *testing.T
	handler http.Handler
}

type authResponse struct {
	User  domains.User `json:"user"`
	Token string       `json:"token"`
}

type productsResponse struct {
	Products []domains.Product `json:"products"`
}

type productResponse struct {
	Product domains.Product `json:"product"`
}

type cartResponse struct {
	Cart domains.Cart `json:"cart"`
}

type orderResponse struct {
	Order domains.Order `json:"order"`
}

type ordersResponse struct {
	Orders []domains.Order `json:"orders"`
}

type usersResponse struct {
	Users []domains.User `json:"users"`
}

type userResponse struct {
	User domains.User `json:"user"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func newAPITestServer(t *testing.T) *apiTestServer {
	t.Helper()

	store := db.NewMemoryStore()
	appService := service.New(store, "test-secret")
	if err := appService.SeedAdmin("Clicky Admin", "admin@clicky.local", "admin12345"); err != nil {
		t.Fatalf("seed admin: %v", err)
	}

	return &apiTestServer{
		t:       t,
		handler: httpv1.NewHandler(appService).Routes(),
	}
}

func (s *apiTestServer) request(method, path string, body any, token string) *httptest.ResponseRecorder {
	s.t.Helper()

	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			s.t.Fatalf("encode request body: %v", err)
		}
	}

	req := httptest.NewRequest(method, path, &payload)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	res := httptest.NewRecorder()
	s.handler.ServeHTTP(res, req)
	return res
}

func decodeResponse[T any](t *testing.T, res *httptest.ResponseRecorder) T {
	t.Helper()

	var out T
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return out
}

func assertStatus(t *testing.T, res *httptest.ResponseRecorder, want int) {
	t.Helper()

	if res.Code != want {
		t.Fatalf("status = %d, want %d, body: %s", res.Code, want, res.Body.String())
	}
}

func TestRegisterLoginAndProfile(t *testing.T) {
	server := newAPITestServer(t)

	registerRes := server.request(http.MethodPost, "/api/v1/auth/register", map[string]any{
		"name":     "Test Customer",
		"email":    "Customer@Example.COM",
		"password": "password123",
	}, "")
	assertStatus(t, registerRes, http.StatusCreated)
	registered := decodeResponse[authResponse](t, registerRes)

	if registered.Token == "" {
		t.Fatal("expected registration token")
	}
	if registered.User.Role != "customer" {
		t.Fatalf("registered role = %q, want customer", registered.User.Role)
	}
	if registered.User.Email != "customer@example.com" {
		t.Fatalf("registered email = %q, want normalized email", registered.User.Email)
	}

	meRes := server.request(http.MethodGet, "/api/v1/me", nil, registered.Token)
	assertStatus(t, meRes, http.StatusOK)
	me := decodeResponse[struct {
		User domains.User `json:"user"`
	}](t, meRes)
	if me.User.ID != registered.User.ID {
		t.Fatalf("profile user ID = %q, want %q", me.User.ID, registered.User.ID)
	}

	loginRes := server.request(http.MethodPost, "/api/v1/auth/login", map[string]any{
		"email":    "customer@example.com",
		"password": "password123",
	}, "")
	assertStatus(t, loginRes, http.StatusOK)
	loggedIn := decodeResponse[authResponse](t, loginRes)
	if loggedIn.Token == "" {
		t.Fatal("expected login token")
	}

	badLoginRes := server.request(http.MethodPost, "/api/v1/auth/login", map[string]any{
		"email":    "customer@example.com",
		"password": "wrong-password",
	}, "")
	assertStatus(t, badLoginRes, http.StatusUnauthorized)
	errBody := decodeResponse[errorResponse](t, badLoginRes)
	if errBody.Error == "" {
		t.Fatal("expected error response for invalid login")
	}
}

func TestLoginRateLimiting(t *testing.T) {
	server := newAPITestServer(t)
	const maxFailedAttempts = 5

	body := map[string]any{
		"email":    "limited@example.com",
		"password": "wrong-password",
	}
	for range maxFailedAttempts {
		res := server.request(http.MethodPost, "/api/v1/auth/login", body, "")
		assertStatus(t, res, http.StatusUnauthorized)
	}

	limitedRes := server.request(http.MethodPost, "/api/v1/auth/login", body, "")
	assertStatus(t, limitedRes, http.StatusTooManyRequests)
	errBody := decodeResponse[errorResponse](t, limitedRes)
	if errBody.Error == "" {
		t.Fatal("expected rate limit error response")
	}
}

func TestProductCartAndOrderFlow(t *testing.T) {
	server := newAPITestServer(t)

	productsRes := server.request(http.MethodGet, "/api/v1/products?category=gaming", nil, "")
	assertStatus(t, productsRes, http.StatusOK)
	products := decodeResponse[productsResponse](t, productsRes)
	if len(products.Products) != 2 {
		t.Fatalf("gaming products count = %d, want 2", len(products.Products))
	}
	for _, product := range products.Products {
		if product.Category != "gaming" {
			t.Fatalf("product category = %q, want gaming", product.Category)
		}
	}

	detailRes := server.request(http.MethodGet, "/api/v1/products/prod-gaming-viper", nil, "")
	assertStatus(t, detailRes, http.StatusOK)
	detail := decodeResponse[productResponse](t, detailRes)
	if detail.Product.Stock != 18 {
		t.Fatalf("initial stock = %d, want 18", detail.Product.Stock)
	}
	if len(detail.Product.Images) != 1 ||
		!detail.Product.Images[0].IsPrimary ||
		detail.Product.Images[0].URL != detail.Product.ImageURL {
		t.Fatalf("detail images = %+v, want primary image matching imageUrl %q", detail.Product.Images, detail.Product.ImageURL)
	}

	registerRes := server.request(http.MethodPost, "/api/v1/auth/register", map[string]any{
		"name":     "Cart Customer",
		"email":    "cart@example.com",
		"password": "password123",
	}, "")
	assertStatus(t, registerRes, http.StatusCreated)
	auth := decodeResponse[authResponse](t, registerRes)

	addCartRes := server.request(http.MethodPost, "/api/v1/cart/items", map[string]any{
		"productId": "prod-gaming-viper",
		"quantity":  2,
	}, auth.Token)
	assertStatus(t, addCartRes, http.StatusCreated)
	addedCart := decodeResponse[cartResponse](t, addCartRes)
	if addedCart.Cart.TotalCents != 49800 {
		t.Fatalf("cart total = %d, want 49800", addedCart.Cart.TotalCents)
	}

	updateCartRes := server.request(http.MethodPatch, "/api/v1/cart/items/prod-gaming-viper", map[string]any{
		"quantity": 1,
	}, auth.Token)
	assertStatus(t, updateCartRes, http.StatusOK)
	updatedCart := decodeResponse[cartResponse](t, updateCartRes)
	if len(updatedCart.Cart.Items) != 1 || updatedCart.Cart.Items[0].Quantity != 1 {
		t.Fatalf("updated cart items = %+v, want one item with quantity 1", updatedCart.Cart.Items)
	}

	orderRes := server.request(http.MethodPost, "/api/v1/orders", map[string]any{
		"paymentMethod": "simulation",
	}, auth.Token)
	assertStatus(t, orderRes, http.StatusCreated)
	createdOrder := decodeResponse[orderResponse](t, orderRes)
	if createdOrder.Order.Status != domains.OrderStatusPending || createdOrder.Order.PaymentStatus != domains.PaymentStatusPending {
		t.Fatalf("order status = %q/%q, want pending/pending", createdOrder.Order.Status, createdOrder.Order.PaymentStatus)
	}
	if createdOrder.Order.TotalCents != 24900 {
		t.Fatalf("order total = %d, want 24900", createdOrder.Order.TotalCents)
	}

	paymentRes := server.request(http.MethodPost, "/api/v1/orders/"+createdOrder.Order.ID+"/payment/simulate", map[string]any{
		"result": "success",
	}, auth.Token)
	assertStatus(t, paymentRes, http.StatusOK)
	paidOrder := decodeResponse[orderResponse](t, paymentRes)
	if paidOrder.Order.Status != domains.OrderStatusConfirmed || paidOrder.Order.PaymentStatus != domains.PaymentStatusPaid {
		t.Fatalf("paid order status = %q/%q, want confirmed/paid", paidOrder.Order.Status, paidOrder.Order.PaymentStatus)
	}

	secondPaymentRes := server.request(http.MethodPost, "/api/v1/orders/"+createdOrder.Order.ID+"/payment/simulate", map[string]any{
		"result": "failure",
	}, auth.Token)
	assertStatus(t, secondPaymentRes, http.StatusBadRequest)

	ordersRes := server.request(http.MethodGet, "/api/v1/orders", nil, auth.Token)
	assertStatus(t, ordersRes, http.StatusOK)
	orders := decodeResponse[ordersResponse](t, ordersRes)
	if len(orders.Orders) != 1 || orders.Orders[0].ID != createdOrder.Order.ID {
		t.Fatalf("orders = %+v, want created order", orders.Orders)
	}
	if orders.Orders[0].PaymentStatus != domains.PaymentStatusPaid {
		t.Fatalf("listed payment status = %q, want paid", orders.Orders[0].PaymentStatus)
	}

	emptyCartRes := server.request(http.MethodGet, "/api/v1/cart", nil, auth.Token)
	assertStatus(t, emptyCartRes, http.StatusOK)
	emptyCart := decodeResponse[cartResponse](t, emptyCartRes)
	if len(emptyCart.Cart.Items) != 0 {
		t.Fatalf("cart items after order = %+v, want empty", emptyCart.Cart.Items)
	}

	updatedProductRes := server.request(http.MethodGet, "/api/v1/products/prod-gaming-viper", nil, "")
	assertStatus(t, updatedProductRes, http.StatusOK)
	updatedProduct := decodeResponse[productResponse](t, updatedProductRes)
	if updatedProduct.Product.Stock != 17 {
		t.Fatalf("stock after order = %d, want 17", updatedProduct.Product.Stock)
	}

	emptyOrderRes := server.request(http.MethodPost, "/api/v1/orders", map[string]any{
		"paymentMethod": "simulation",
	}, auth.Token)
	assertStatus(t, emptyOrderRes, http.StatusBadRequest)
}

func TestProductLookupBySlug(t *testing.T) {
	server := newAPITestServer(t)

	res := server.request(http.MethodGet, "/api/v1/products/slug/viper-x1-gaming-mouse", nil, "")
	assertStatus(t, res, http.StatusOK)
	body := decodeResponse[productResponse](t, res)
	if body.Product.ID != "prod-gaming-viper" || body.Product.Slug != "viper-x1-gaming-mouse" {
		t.Fatalf("product = %+v, want viper x1 mouse", body.Product)
	}

	missingRes := server.request(http.MethodGet, "/api/v1/products/slug/does-not-exist", nil, "")
	assertStatus(t, missingRes, http.StatusNotFound)
	missing := decodeResponse[errorResponse](t, missingRes)
	if missing.Error == "" {
		t.Fatal("expected error message for missing slug")
	}

	emptyRes := server.request(http.MethodGet, "/api/v1/products/slug/", nil, "")
	assertStatus(t, emptyRes, http.StatusNotFound)

	nestedRes := server.request(http.MethodGet, "/api/v1/products/slug/foo/bar", nil, "")
	assertStatus(t, nestedRes, http.StatusNotFound)
}

func TestAdminProductManagementRequiresAdmin(t *testing.T) {
	server := newAPITestServer(t)

	registerRes := server.request(http.MethodPost, "/api/v1/auth/register", map[string]any{
		"name":     "Regular Customer",
		"email":    "regular@example.com",
		"password": "password123",
	}, "")
	assertStatus(t, registerRes, http.StatusCreated)
	customer := decodeResponse[authResponse](t, registerRes)

	forbiddenRes := server.request(http.MethodGet, "/api/v1/admin/products", nil, customer.Token)
	assertStatus(t, forbiddenRes, http.StatusForbidden)

	adminLoginRes := server.request(http.MethodPost, "/api/v1/auth/login", map[string]any{
		"email":    "admin@clicky.local",
		"password": "admin12345",
	}, "")
	assertStatus(t, adminLoginRes, http.StatusOK)
	admin := decodeResponse[authResponse](t, adminLoginRes)

	createRes := server.request(http.MethodPost, "/api/v1/admin/products", map[string]any{
		"name":        "Admin Test Mouse",
		"slug":        "admin-test-mouse",
		"description": "A product created by the admin API tests.",
		"category":    "office",
		"priceCents":  15900,
		"currency":    "PLN",
		"dpi":         8000,
		"wireless":    true,
		"ergonomic":   true,
		"stock":       7,
		"imageUrl":    "/assets/products/admin-test.jpg",
	}, admin.Token)
	assertStatus(t, createRes, http.StatusCreated)
	created := decodeResponse[productResponse](t, createRes)
	if created.Product.ID == "" {
		t.Fatal("expected created product ID")
	}

	updateRes := server.request(http.MethodPatch, "/api/v1/admin/products/"+created.Product.ID, map[string]any{
		"name":  "Admin Test Mouse Updated",
		"stock": 9,
	}, admin.Token)
	assertStatus(t, updateRes, http.StatusOK)
	updated := decodeResponse[productResponse](t, updateRes)
	if updated.Product.Name != "Admin Test Mouse Updated" || updated.Product.Stock != 9 {
		t.Fatalf("updated product = %+v, want updated name and stock", updated.Product)
	}

	deleteRes := server.request(http.MethodDelete, "/api/v1/admin/products/"+created.Product.ID, nil, admin.Token)
	assertStatus(t, deleteRes, http.StatusNoContent)

	deletedDetailRes := server.request(http.MethodGet, "/api/v1/products/"+created.Product.ID, nil, "")
	assertStatus(t, deletedDetailRes, http.StatusNotFound)

	adminOrdersRes := server.request(http.MethodGet, "/api/v1/admin/orders", nil, admin.Token)
	assertStatus(t, adminOrdersRes, http.StatusOK)
}

func TestAdminProductValidation(t *testing.T) {
	server := newAPITestServer(t)

	adminLoginRes := server.request(http.MethodPost, "/api/v1/auth/login", map[string]any{
		"email":    "admin@clicky.local",
		"password": "admin12345",
	}, "")
	assertStatus(t, adminLoginRes, http.StatusOK)
	admin := decodeResponse[authResponse](t, adminLoginRes)

	invalidSlugRes := server.request(http.MethodPost, "/api/v1/admin/products", map[string]any{
		"name":        "Invalid Slug Mouse",
		"slug":        "Invalid Slug",
		"description": "A product with an invalid slug.",
		"category":    "gaming",
		"priceCents":  15900,
		"currency":    "PLN",
		"dpi":         8000,
		"stock":       7,
	}, admin.Token)
	assertStatus(t, invalidSlugRes, http.StatusBadRequest)

	invalidPriceRes := server.request(http.MethodPost, "/api/v1/admin/products", map[string]any{
		"name":        "Invalid Price Mouse",
		"slug":        "invalid-price-mouse",
		"description": "A product with an invalid price.",
		"category":    "gaming",
		"priceCents":  0,
		"currency":    "PLN",
		"dpi":         8000,
		"stock":       7,
	}, admin.Token)
	assertStatus(t, invalidPriceRes, http.StatusBadRequest)
}

func TestAdminUserManagementRequiresAdmin(t *testing.T) {
	server := newAPITestServer(t)

	registerRes := server.request(http.MethodPost, "/api/v1/auth/register", map[string]any{
		"name":     "Role Customer",
		"email":    "role@example.com",
		"password": "password123",
	}, "")
	assertStatus(t, registerRes, http.StatusCreated)
	customer := decodeResponse[authResponse](t, registerRes)

	forbiddenRes := server.request(http.MethodGet, "/api/v1/admin/users", nil, customer.Token)
	assertStatus(t, forbiddenRes, http.StatusForbidden)

	adminLoginRes := server.request(http.MethodPost, "/api/v1/auth/login", map[string]any{
		"email":    "admin@clicky.local",
		"password": "admin12345",
	}, "")
	assertStatus(t, adminLoginRes, http.StatusOK)
	admin := decodeResponse[authResponse](t, adminLoginRes)

	usersRes := server.request(http.MethodGet, "/api/v1/admin/users", nil, admin.Token)
	assertStatus(t, usersRes, http.StatusOK)
	users := decodeResponse[usersResponse](t, usersRes)
	if len(users.Users) != 2 {
		t.Fatalf("users count = %d, want seeded admin and customer", len(users.Users))
	}

	filteredRes := server.request(http.MethodGet, "/api/v1/admin/users?role=customer&q=role", nil, admin.Token)
	assertStatus(t, filteredRes, http.StatusOK)
	filtered := decodeResponse[usersResponse](t, filteredRes)
	if len(filtered.Users) != 1 || filtered.Users[0].ID != customer.User.ID {
		t.Fatalf("filtered users = %+v, want role customer", filtered.Users)
	}

	detailRes := server.request(http.MethodGet, "/api/v1/admin/users/"+customer.User.ID, nil, admin.Token)
	assertStatus(t, detailRes, http.StatusOK)
	detail := decodeResponse[userResponse](t, detailRes)
	if detail.User.Email != "role@example.com" {
		t.Fatalf("user detail email = %q, want role@example.com", detail.User.Email)
	}

	updateRes := server.request(http.MethodPatch, "/api/v1/admin/users/"+customer.User.ID, map[string]any{
		"role": "admin",
	}, admin.Token)
	assertStatus(t, updateRes, http.StatusOK)
	updated := decodeResponse[userResponse](t, updateRes)
	if updated.User.Role != "admin" {
		t.Fatalf("updated role = %q, want admin", updated.User.Role)
	}

	// Role changes are picked up from the store on each authenticated request.
	promotedRes := server.request(http.MethodGet, "/api/v1/admin/orders", nil, customer.Token)
	assertStatus(t, promotedRes, http.StatusOK)

	invalidRoleRes := server.request(http.MethodPatch, "/api/v1/admin/users/"+customer.User.ID, map[string]any{
		"role": "manager",
	}, admin.Token)
	assertStatus(t, invalidRoleRes, http.StatusBadRequest)

	missingUserRes := server.request(http.MethodGet, "/api/v1/admin/users/usr_missing", nil, admin.Token)
	assertStatus(t, missingUserRes, http.StatusNotFound)
}
