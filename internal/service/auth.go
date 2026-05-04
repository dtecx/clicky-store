package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
)

type tokenClaims struct {
	UserID    string `json:"userId"`
	Role      string `json:"role"`
	ExpiresAt int64  `json:"expiresAt"`
}

type tokenSigner struct {
	secret []byte
}

func newTokenSigner(secret string) *tokenSigner {
	return &tokenSigner{secret: []byte(secret)}
}

func (s *tokenSigner) sign(claims tokenClaims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.signature(encodedPayload)

	return encodedPayload + "." + signature, nil
}

func (s *tokenSigner) verify(token string) (tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return tokenClaims{}, errors.New("invalid token")
	}

	expected := s.signature(parts[0])
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return tokenClaims{}, errors.New("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return tokenClaims{}, err
	}

	var claims tokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return tokenClaims{}, err
	}

	return claims, nil
}

func (s *tokenSigner) signature(payload string) string {
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func hashPassword(password string) (string, string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}

	return derivePasswordHash(password, salt), hex.EncodeToString(salt), nil
}

func verifyPassword(password, encodedSalt, expectedHash string) bool {
	salt, err := hex.DecodeString(encodedSalt)
	if err != nil {
		return false
	}

	actualHash := derivePasswordHash(password, salt)
	return hmac.Equal([]byte(actualHash), []byte(expectedHash))
}

func derivePasswordHash(password string, salt []byte) string {
	digest := []byte(password)
	for i := 0; i < 120000; i++ {
		mac := hmac.New(sha256.New, salt)
		mac.Write(digest)
		digest = mac.Sum(nil)
	}

	return hex.EncodeToString(digest)
}
