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
	if cfg.UploadDir != defaultUploadDir {
		t.Fatalf("UploadDir = %q, want default", cfg.UploadDir)
	}
	if cfg.UploadURLPrefix != defaultUploadURLPrefix {
		t.Fatalf("UploadURLPrefix = %q, want default", cfg.UploadURLPrefix)
	}
	if cfg.MaxProductImages != defaultMaxProductImages {
		t.Fatalf("MaxProductImages = %d, want %d", cfg.MaxProductImages, defaultMaxProductImages)
	}
	if cfg.MaxProductImageBytes != defaultMaxProductImageBytes {
		t.Fatalf("MaxProductImageBytes = %d, want %d", cfg.MaxProductImageBytes, defaultMaxProductImageBytes)
	}
	if cfg.MaxProductUploadBytes != defaultMaxProductUploadBytes {
		t.Fatalf("MaxProductUploadBytes = %d, want %d", cfg.MaxProductUploadBytes, defaultMaxProductUploadBytes)
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate development config: %v", err)
	}
}

func TestLoadUsesUploadEnvironment(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("UPLOAD_DIR", "/tmp/clicky-uploads")
	t.Setenv("UPLOAD_URL_PREFIX", "media/uploads/")
	t.Setenv("MAX_PRODUCT_IMAGES", "8")
	t.Setenv("MAX_PRODUCT_IMAGE_BYTES", "1024")
	t.Setenv("MAX_PRODUCT_UPLOAD_BYTES", "4096")

	cfg := Load()

	if cfg.UploadDir != "/tmp/clicky-uploads" {
		t.Fatalf("UploadDir = %q, want env value", cfg.UploadDir)
	}
	if cfg.UploadURLPrefix != "/media/uploads" {
		t.Fatalf("UploadURLPrefix = %q, want cleaned URL prefix", cfg.UploadURLPrefix)
	}
	if cfg.MaxProductImages != 8 ||
		cfg.MaxProductImageBytes != 1024 ||
		cfg.MaxProductUploadBytes != 4096 {
		t.Fatalf("upload limits = %d/%d/%d, want 8/1024/4096", cfg.MaxProductImages, cfg.MaxProductImageBytes, cfg.MaxProductUploadBytes)
	}
}

func TestValidateRejectsInvalidUploadConfig(t *testing.T) {
	tests := []struct {
		name    string
		cfg     Config
		wantErr string
	}{
		{
			name: "missing dir",
			cfg: Config{
				AppEnv:                "development",
				UploadURLPrefix:       "/uploads",
				MaxProductImages:      10,
				MaxProductImageBytes:  1024,
				MaxProductUploadBytes: 1024,
			},
			wantErr: "UPLOAD_DIR",
		},
		{
			name: "root prefix",
			cfg: Config{
				AppEnv:                "development",
				UploadDir:             "/tmp/uploads",
				UploadURLPrefix:       "/",
				MaxProductImages:      10,
				MaxProductImageBytes:  1024,
				MaxProductUploadBytes: 1024,
			},
			wantErr: "UPLOAD_URL_PREFIX",
		},
		{
			name: "invalid count",
			cfg: Config{
				AppEnv:                "development",
				UploadDir:             "/tmp/uploads",
				UploadURLPrefix:       "/uploads",
				MaxProductImages:      0,
				MaxProductImageBytes:  1024,
				MaxProductUploadBytes: 1024,
			},
			wantErr: "MAX_PRODUCT_IMAGES",
		},
		{
			name: "multipart limit smaller than image limit",
			cfg: Config{
				AppEnv:                "development",
				UploadDir:             "/tmp/uploads",
				UploadURLPrefix:       "/uploads",
				MaxProductImages:      10,
				MaxProductImageBytes:  2048,
				MaxProductUploadBytes: 1024,
			},
			wantErr: "MAX_PRODUCT_UPLOAD_BYTES",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.Validate()
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("Validate error = %v, want containing %q", err, tt.wantErr)
			}
		})
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
