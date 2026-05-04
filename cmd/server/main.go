package main

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"clicky-store/internal/adapters/db"
	httpv1 "clicky-store/internal/adapters/http/v1"
	"clicky-store/internal/service"
	"clicky-store/internal/web"
)

func main() {
	port := env("PORT", "8080")
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	store := db.NewMemoryStore()
	appService := service.New(store, env("AUTH_SECRET", "clicky-store-dev-secret"))
	if err := appService.SeedAdmin("Clicky Admin", "admin@clicky.local", "admin12345"); err != nil {
		logger.Error("admin seed failed", "error", err)
	}

	api := httpv1.NewHandler(appService)
	handler := web.Chain(
		api.Routes(),
		web.CORS(env("FRONTEND_ORIGIN", "*")),
		web.Logging(logger),
	)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("starting clicky-store API", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
