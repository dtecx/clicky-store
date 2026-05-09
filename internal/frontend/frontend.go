// Package frontend serves the production React build for the storefront and
// admin UI. The Go server expects a Vite build output directory pointed at by
// FRONTEND_DIST_DIR; in development the React app is served by `npm run dev`
// and proxied to the Go API directly.
package frontend

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

const distDirEnv = "FRONTEND_DIST_DIR"

// Handler returns an HTTP handler that serves the React frontend with SPA
// fallback semantics. When FRONTEND_DIST_DIR points at a Vite build directory,
// those files are served; unknown paths under the React-owned prefixes (such
// as `/products/{slug}` or `/admin`) fall back to `index.html` so the client
// router can take over.
//
// API, health, and upload paths are mounted on other prefixes by the caller,
// so they never reach this handler.
//
// When FRONTEND_DIST_DIR is unset or empty, the handler returns a small text
// placeholder pointing developers at the frontend dev server. This keeps the
// Go binary runnable for backend smoke tests without tying it to an embedded
// SPA copy.
func Handler() http.Handler {
	distFiles, ok := distFSFromEnv()
	if !ok {
		return http.HandlerFunc(serveMissingDist)
	}

	return newDistHandler(distFiles)
}

func distFSFromEnv() (fs.FS, bool) {
	distDir := strings.TrimSpace(os.Getenv(distDirEnv))
	if distDir == "" {
		return nil, false
	}

	files := os.DirFS(distDir)
	if _, err := fs.Stat(files, "index.html"); err != nil {
		return nil, false
	}

	return files, true
}

func newDistHandler(distFiles fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(distFiles))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		urlPath := r.URL.Path

		// `http.FileServer` already serves index.html for `/`; no fallback
		// needed there.
		if urlPath == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}

		clean := strings.TrimPrefix(path.Clean(urlPath), "/")
		if clean == "" {
			fileServer.ServeHTTP(w, r)
			return
		}

		if fileExists(distFiles, clean) {
			fileServer.ServeHTTP(w, r)
			return
		}

		if isFrontendRoute(urlPath) {
			serveIndex(w, r, distFiles)
			return
		}

		// Unknown path with no SPA prefix: defer to the file server, which
		// will produce a 404 in a way consistent with prior behavior.
		fileServer.ServeHTTP(w, r)
	})
}

func fileExists(files fs.FS, name string) bool {
	_, err := fs.Stat(files, name)
	return err == nil
}

// frontendPrefixes lists URL prefixes owned by the React app. Direct reloads
// of any path under one of these prefixes should serve `index.html` so the
// client router can render the corresponding page.
var frontendPrefixes = []string{
	"/products/",
	"/cart",
	"/checkout",
	"/orders",
	"/login",
	"/register",
	"/admin",
}

func isFrontendRoute(urlPath string) bool {
	for _, prefix := range frontendPrefixes {
		if urlPath == strings.TrimSuffix(prefix, "/") {
			return true
		}
		if strings.HasSuffix(prefix, "/") && strings.HasPrefix(urlPath, prefix) {
			return true
		}
		if !strings.HasSuffix(prefix, "/") && strings.HasPrefix(urlPath, prefix+"/") {
			return true
		}
	}
	return false
}

func serveIndex(w http.ResponseWriter, _ *http.Request, files fs.FS) {
	data, err := fs.ReadFile(files, "index.html")
	if err != nil {
		http.Error(w, "frontend not available", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// Always revalidate so users see updated frontend builds without manually
	// clearing caches; static assets keep their hashed filenames so they can
	// be cached aggressively elsewhere.
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

const missingDistMessage = `Clicky-Store frontend is not configured.

Set FRONTEND_DIST_DIR to a Vite build directory (e.g. /app/frontend/dist)
or run the React dev server from ./frontend with ` + "`npm run dev`" + ` and
let it proxy API/uploads/asset traffic to this server.
`

func serveMissingDist(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" && !isFrontendRoute(r.URL.Path) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(missingDistMessage))
}
