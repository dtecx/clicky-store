package frontend

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

//go:embed static
var staticFiles embed.FS

const distDirEnv = "FRONTEND_DIST_DIR"

// Handler returns an HTTP handler that serves the configured frontend with SPA
// fallback semantics. When FRONTEND_DIST_DIR points at a Vite build directory,
// those files are served first. Otherwise the embedded legacy frontend is used.
//
// Files that exist on disk are served as-is; unknown
// paths under `/products/`, `/cart`, `/checkout`, `/orders`, `/login`,
// `/register`, and `/admin` fall back to `index.html` so React Router can
// handle the route on the client. API/health/upload paths are mounted on
// other prefixes by the caller, so they never reach this handler.
func Handler() http.Handler {
	legacyFiles, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic(err)
	}

	if distFiles, ok := distFSFromEnv(); ok {
		return newHandler(distFiles, legacyFiles, isLegacyProductAsset)
	}

	return newHandler(legacyFiles, nil, nil)
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

func newHandler(primaryFiles fs.FS, fallbackFiles fs.FS, allowFallback func(string) bool) http.Handler {
	primaryServer := http.FileServer(http.FS(primaryFiles))
	var fallbackServer http.Handler
	if fallbackFiles != nil {
		fallbackServer = http.FileServer(http.FS(fallbackFiles))
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		urlPath := r.URL.Path

		// `http.FileServer` already serves index.html for `/`; no fallback
		// needed there.
		if urlPath == "/" {
			primaryServer.ServeHTTP(w, r)
			return
		}

		clean := strings.TrimPrefix(path.Clean(urlPath), "/")
		if clean == "" {
			primaryServer.ServeHTTP(w, r)
			return
		}

		if fileExists(primaryFiles, clean) {
			primaryServer.ServeHTTP(w, r)
			return
		}

		if fallbackServer != nil && allowFallback != nil && allowFallback(clean) && fileExists(fallbackFiles, clean) {
			fallbackServer.ServeHTTP(w, r)
			return
		}

		if isFrontendRoute(urlPath) {
			serveIndex(w, r, primaryFiles)
			return
		}

		// Unknown path with no SPA prefix: defer to the file server, which
		// will produce a 404 in a way consistent with prior behavior.
		primaryServer.ServeHTTP(w, r)
	})
}

func fileExists(files fs.FS, name string) bool {
	_, err := fs.Stat(files, name)
	return err == nil
}

func isLegacyProductAsset(name string) bool {
	return strings.HasPrefix(name, "assets/products/")
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
