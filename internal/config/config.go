package config

import (
	"errors"
	"os"
	"strings"
)

const developmentAuthSecret = "change-me-for-local-development"

type Config struct {
	AppEnv         string
	Port           string
	FrontendOrigin string
	AuthSecret     string

	AdminName     string
	AdminEmail    string
	AdminPassword string

	DatabaseURL string
}

func Load() Config {
	appEnv := env("APP_ENV", "development")

	return Config{
		AppEnv:         appEnv,
		Port:           env("PORT", "8080"),
		FrontendOrigin: env("FRONTEND_ORIGIN", "*"),
		AuthSecret:     env("AUTH_SECRET", defaultAuthSecret(appEnv)),

		AdminName:     env("ADMIN_NAME", defaultAdminName(appEnv)),
		AdminEmail:    env("ADMIN_EMAIL", defaultAdminEmail(appEnv)),
		AdminPassword: env("ADMIN_PASSWORD", defaultAdminPassword(appEnv)),

		DatabaseURL: env("DATABASE_URL", ""),
	}
}

func (c Config) Validate() error {
	if c.AppEnv == "development" {
		return nil
	}

	if c.AuthSecret == "" {
		return errors.New("AUTH_SECRET is required outside development")
	}
	if c.AuthSecret == developmentAuthSecret {
		return errors.New("AUTH_SECRET must be changed outside development")
	}

	return nil
}

func (c Config) HasAdminSeed() bool {
	return c.AdminName != "" && c.AdminEmail != "" && c.AdminPassword != ""
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func defaultAuthSecret(appEnv string) string {
	if appEnv == "development" {
		return developmentAuthSecret
	}

	return ""
}

func defaultAdminName(appEnv string) string {
	if appEnv == "development" {
		return "Clicky Admin"
	}

	return ""
}

func defaultAdminEmail(appEnv string) string {
	if appEnv == "development" {
		return "admin@clicky.local"
	}

	return ""
}

func defaultAdminPassword(appEnv string) string {
	if appEnv == "development" {
		return "admin12345"
	}

	return ""
}
