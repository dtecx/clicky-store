package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	FrontendOrigin string
	AuthSecret     string

	AdminName     string
	AdminEmail    string
	AdminPassword string

	DatabaseURL string
}

func Load() Config {
	return Config{
		Port:           env("PORT", "8080"),
		FrontendOrigin: env("FRONTEND_ORIGIN", "*"),
		AuthSecret:     env("AUTH_SECRET", "clicky-store-dev-secret"),

		AdminName:     env("ADMIN_NAME", "Clicky Admin"),
		AdminEmail:    env("ADMIN_EMAIL", "admin@clicky.local"),
		AdminPassword: env("ADMIN_PASSWORD", "admin12345"),

		DatabaseURL: env("DATABASE_URL", ""),
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}
