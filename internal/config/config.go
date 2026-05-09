package config

import (
	"errors"
	"os"
	"path"
	"strconv"
	"strings"
)

const developmentAuthSecret = "change-me-for-local-development"

const (
	defaultUploadDir             = "./data/uploads"
	defaultUploadURLPrefix       = "/uploads"
	defaultMaxProductImages      = 10
	defaultMaxProductImageBytes  = 4 * 1024 * 1024
	defaultMaxProductUploadBytes = 48 * 1024 * 1024
)

type Config struct {
	AppEnv         string
	Port           string
	FrontendOrigin string
	AuthSecret     string

	AdminName     string
	AdminEmail    string
	AdminPassword string

	DatabaseURL string

	UploadDir             string
	UploadURLPrefix       string
	MaxProductImages      int
	MaxProductImageBytes  int64
	MaxProductUploadBytes int64
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

		UploadDir:             env("UPLOAD_DIR", defaultUploadDir),
		UploadURLPrefix:       cleanURLPrefix(env("UPLOAD_URL_PREFIX", defaultUploadURLPrefix)),
		MaxProductImages:      envInt("MAX_PRODUCT_IMAGES", defaultMaxProductImages),
		MaxProductImageBytes:  envInt64("MAX_PRODUCT_IMAGE_BYTES", defaultMaxProductImageBytes),
		MaxProductUploadBytes: envInt64("MAX_PRODUCT_UPLOAD_BYTES", defaultMaxProductUploadBytes),
	}
}

func (c Config) Validate() error {
	if err := c.validateUploads(); err != nil {
		return err
	}

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

func (c Config) validateUploads() error {
	if strings.TrimSpace(c.UploadDir) == "" {
		return errors.New("UPLOAD_DIR is required")
	}
	if c.UploadURLPrefix == "" || c.UploadURLPrefix == "/" || !strings.HasPrefix(c.UploadURLPrefix, "/") {
		return errors.New("UPLOAD_URL_PREFIX must be an absolute non-root URL path")
	}
	if strings.Contains(c.UploadURLPrefix, "..") {
		return errors.New("UPLOAD_URL_PREFIX must not contain path traversal")
	}
	if c.MaxProductImages <= 0 {
		return errors.New("MAX_PRODUCT_IMAGES must be greater than zero")
	}
	if c.MaxProductImageBytes <= 0 {
		return errors.New("MAX_PRODUCT_IMAGE_BYTES must be greater than zero")
	}
	if c.MaxProductUploadBytes < c.MaxProductImageBytes {
		return errors.New("MAX_PRODUCT_UPLOAD_BYTES must be greater than or equal to MAX_PRODUCT_IMAGE_BYTES")
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

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func envInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}

	return parsed
}

func cleanURLPrefix(prefix string) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return defaultUploadURLPrefix
	}
	if !strings.HasPrefix(prefix, "/") {
		prefix = "/" + prefix
	}

	clean := path.Clean(prefix)
	if clean == "." {
		return defaultUploadURLPrefix
	}
	if clean == "/" {
		return "/"
	}

	return strings.TrimSuffix(clean, "/")
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
