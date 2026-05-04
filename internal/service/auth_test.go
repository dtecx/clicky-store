package service

import "testing"

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
	if verifyPassword("password123", "old-scheme", hash) {
		t.Fatal("expected non-bcrypt password scheme to be rejected")
	}
}
