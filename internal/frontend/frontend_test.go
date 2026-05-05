package frontend

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerServesStorefront(t *testing.T) {
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if !strings.Contains(res.Body.String(), "Clicky-Store") {
		t.Fatal("expected storefront HTML")
	}
}

func TestHandlerServesStaticAssets(t *testing.T) {
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/app.js", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if !strings.Contains(res.Body.String(), "API_BASE") {
		t.Fatal("expected storefront script")
	}
}

func TestHandlerFallsBackToIndexForFrontendRoutes(t *testing.T) {
	handler := Handler()

	cases := []string{
		"/products/viper-x1-gaming-mouse",
		"/cart",
		"/checkout",
		"/orders",
		"/login",
		"/register",
		"/admin",
		"/admin/products",
	}

	for _, urlPath := range cases {
		t.Run(urlPath, func(t *testing.T) {
			res := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, urlPath, nil)
			handler.ServeHTTP(res, req)

			if res.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
			}
			if !strings.Contains(res.Body.String(), "Clicky-Store") {
				t.Fatalf("expected fallback HTML for %q", urlPath)
			}
			if got := res.Header().Get("Content-Type"); !strings.Contains(got, "text/html") {
				t.Fatalf("content-type = %q, want text/html", got)
			}
		})
	}
}

func TestHandlerReturnsNotFoundForUnknownPaths(t *testing.T) {
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/no-such-path.txt", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNotFound)
	}
}
