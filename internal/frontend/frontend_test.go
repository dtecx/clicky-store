package frontend

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func TestHandlerServesPlaceholderWhenDistMissing(t *testing.T) {
	t.Setenv(distDirEnv, "")
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if got := res.Header().Get("Content-Type"); !strings.HasPrefix(got, "text/plain") {
		t.Fatalf("content-type = %q, want text/plain prefix", got)
	}
	if !strings.Contains(res.Body.String(), "FRONTEND_DIST_DIR") {
		t.Fatalf("expected placeholder body, got %q", res.Body.String())
	}
}

func TestHandlerNotFoundWhenDistMissingForUnknownPaths(t *testing.T) {
	t.Setenv(distDirEnv, "")
	handler := Handler()

	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/no-such-asset.js", nil)
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNotFound)
	}
}

func TestHandlerFallsBackToReactIndexForFrontendRoutes(t *testing.T) {
	dir := writeTempDist(t, []distFile{
		{Name: "index.html", Body: `<!doctype html><title>Clicky-Store React</title>`},
		{Name: "assets/index.js", Body: "console.log('react bundle')"},
	})

	t.Setenv(distDirEnv, dir)
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
			if !strings.Contains(res.Body.String(), "Clicky-Store React") {
				t.Fatalf("expected React index for %q, got %q", urlPath, res.Body.String())
			}
			if got := res.Header().Get("Content-Type"); !strings.Contains(got, "text/html") {
				t.Fatalf("content-type = %q, want text/html", got)
			}
		})
	}
}

func TestHandlerServesReactDistAssets(t *testing.T) {
	dir := writeTempDist(t, []distFile{
		{Name: "index.html", Body: `<!doctype html><title>Clicky-Store React</title>`},
		{Name: "assets/index.js", Body: "console.log('react bundle')"},
		{Name: "assets/products/viper-x1.svg", Body: `<svg><title>Viper X1</title></svg>`},
	})
	t.Setenv(distDirEnv, dir)
	handler := Handler()

	t.Run("serves hashed JS assets", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/assets/index.js", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if !strings.Contains(res.Body.String(), "react bundle") {
			t.Fatal("expected React asset body")
		}
	})

	t.Run("serves seed product SVGs from dist", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/assets/products/viper-x1.svg", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if !strings.Contains(res.Body.String(), "Viper X1") {
			t.Fatal("expected seed product SVG body")
		}
	})

	t.Run("returns 404 for unknown non-SPA path", func(t *testing.T) {
		res := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/missing.txt", nil)
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusNotFound)
		}
	})
}

func TestServeIndexFromInMemoryFS(t *testing.T) {
	files := fstest.MapFS{
		"index.html": {Data: []byte("<!doctype html><title>Memory FS</title>")},
	}
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/products/x", nil)
	serveIndex(res, req, files)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if !strings.Contains(res.Body.String(), "Memory FS") {
		t.Fatal("expected in-memory index body")
	}
}

type distFile struct {
	Name string
	Body string
}

// writeTempDist materializes a temporary frontend build directory so the
// handler can use os.DirFS the same way it does in production. Files are
// created relative to the returned directory; subdirectories are created as
// needed.
func writeTempDist(t *testing.T, files []distFile) string {
	t.Helper()
	dir := t.TempDir()
	for _, file := range files {
		full := filepath.Join(dir, filepath.FromSlash(file.Name))
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", filepath.Dir(full), err)
		}
		if err := os.WriteFile(full, []byte(file.Body), 0o644); err != nil {
			t.Fatalf("write %s: %v", file.Name, err)
		}
	}
	return dir
}
