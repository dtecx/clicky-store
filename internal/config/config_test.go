package config

import (
	"strings"
	"testing"
)

func TestLoadUsesDevelopmentDefaultsOnlyInDevelopment(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("AUTH_SECRET", "")
	t.Setenv("ADMIN_NAME", "")
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD", "")

	cfg := Load()

	if cfg.AuthSecret != developmentAuthSecret {
		t.Fatalf("AuthSecret = %q, want development default", cfg.AuthSecret)
	}
	if !cfg.HasAdminSeed() {
		t.Fatal("expected development admin seed defaults")
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate development config: %v", err)
	}
}

func TestValidateRequiresProductionAuthSecret(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_SECRET", "")
	t.Setenv("ADMIN_NAME", "")
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD", "")

	cfg := Load()

	if cfg.AuthSecret != "" {
		t.Fatalf("AuthSecret = %q, want empty outside development without env", cfg.AuthSecret)
	}
	if cfg.HasAdminSeed() {
		t.Fatal("did not expect admin seed defaults outside development")
	}

	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "AUTH_SECRET") {
		t.Fatalf("Validate error = %v, want AUTH_SECRET error", err)
	}
}

func TestValidateRejectsDevelopmentSecretOutsideDevelopment(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_SECRET", developmentAuthSecret)

	err := Load().Validate()
	if err == nil || !strings.Contains(err.Error(), "must be changed") {
		t.Fatalf("Validate error = %v, want changed-secret error", err)
	}
}

func TestValidateAcceptsProductionAuthSecret(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_SECRET", "replace-with-a-long-production-secret")

	if err := Load().Validate(); err != nil {
		t.Fatalf("Validate production config: %v", err)
	}
}
