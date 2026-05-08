package frontend

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestHandlerServesStorefront(t *testing.T) {
	t.Setenv(distDirEnv, "")
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
	t.Setenv(distDirEnv, "")
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
	t.Setenv(distDirEnv, "")
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
	t.Setenv(distDirEnv, "")
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/no-such-path.txt", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNotFound)
	}
}

func TestHandlerServesReactDistWithLegacyProductAssetFallback(t *testing.T) {
	handler := newHandler(
		fstest.MapFS{
			"index.html": {
				Data: []byte("<!doctype html><title>React Clicky-Store</title>"),
			},
			"assets/index.js": {
				Data: []byte("console.log('react bundle')"),
			},
		},
		fstest.MapFS{
			"app.js": {
				Data: []byte("console.log('legacy bundle')"),
			},
			"assets/products/viper-x1.svg": {
				Data: []byte("<svg><title>Viper X1</title></svg>"),
			},
		},
		isLegacyProductAsset,
	)

	t.Run("serves dist index for frontend routes", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/products/viper-x1-gaming-mouse", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if !strings.Contains(res.Body.String(), "React Clicky-Store") {
			t.Fatal("expected React dist HTML")
		}
	})

	t.Run("serves dist assets first", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/assets/index.js", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if !strings.Contains(res.Body.String(), "react bundle") {
			t.Fatal("expected React dist asset")
		}
	})

	t.Run("serves legacy product assets", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/assets/products/viper-x1.svg", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if !strings.Contains(res.Body.String(), "Viper X1") {
			t.Fatal("expected legacy product asset")
		}
	})

	t.Run("does not expose legacy app files", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/app.js", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusNotFound)
		}
	})
}
