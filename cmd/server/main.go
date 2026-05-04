package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"clicky-store/internal/adapters/db"
	dbpostgres "clicky-store/internal/adapters/db/postgres"
	httpv1 "clicky-store/internal/adapters/http/v1"
	"clicky-store/internal/config"
	"clicky-store/internal/core/ports"
	"clicky-store/internal/frontend"
	"clicky-store/internal/service"
	"clicky-store/internal/web"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	var store ports.Store
	if cfg.DatabaseURL == "" {
		logger.Warn("DATABASE_URL is not set; using in-memory store")
		store = db.NewMemoryStore()
	} else {
		postgresStore, err := dbpostgres.New(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("postgres store initialization failed", "error", err)
			os.Exit(1)
		}
		defer postgresStore.Close()

		logger.Info("using postgres store")
		store = postgresStore
	}

	appService := service.New(store, cfg.AuthSecret)

	if err := appService.SeedAdmin(cfg.AdminName, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		logger.Error("admin seed failed", "error", err)
	}

	api := httpv1.NewHandler(appService)

	mux := http.NewServeMux()
	apiRoutes := api.Routes()
	mux.Handle("/api/v1/", apiRoutes)
	mux.Handle("/healthz", apiRoutes)
	mux.Handle("/", frontend.Handler())

	handler := web.Chain(
		mux,
		web.CORS(cfg.FrontendOrigin),
		web.Logging(logger),
	)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("starting clicky-store API", "addr", server.Addr)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}
