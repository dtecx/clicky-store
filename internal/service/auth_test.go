package service

import (
	"encoding/hex"
	"testing"
)

func TestHashPasswordUsesBcrypt(t *testing.T) {
	hash, scheme, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("hashPassword: %v", err)
	}

	if scheme != passwordHashSchemeBcrypt {
		t.Fatalf("scheme = %q, want %q", scheme, passwordHashSchemeBcrypt)
	}
	if hash == "" {
		t.Fatal("expected password hash")
	}
	if !verifyPassword("password123", scheme, hash) {
		t.Fatal("expected bcrypt password verification to pass")
	}
	if verifyPassword("wrong-password", scheme, hash) {
		t.Fatal("expected bcrypt password verification to reject wrong password")
	}
}

func TestVerifyPasswordSupportsLegacySaltedHash(t *testing.T) {
	salt := []byte("legacy-test-salt")
	encodedSalt := hex.EncodeToString(salt)
	legacyHash := derivePasswordHash("password123", salt)

	if !verifyPassword("password123", encodedSalt, legacyHash) {
		t.Fatal("expected legacy password verification to pass")
	}
	if verifyPassword("wrong-password", encodedSalt, legacyHash) {
		t.Fatal("expected legacy password verification to reject wrong password")
	}
}
