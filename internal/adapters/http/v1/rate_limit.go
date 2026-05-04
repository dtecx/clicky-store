package v1

import (
	"net"
	"net/http"
	"sync"
	"time"
)

const (
	loginRateLimitMaxFailures = 5
	loginRateLimitWindow      = 15 * time.Minute
)

type loginAttempt struct {
	failures  int
	expiresAt time.Time
}

type loginRateLimiter struct {
	mu          sync.Mutex
	maxFailures int
	window      time.Duration
	attempts    map[string]loginAttempt
	now         func() time.Time
}

func newLoginRateLimiter(maxFailures int, window time.Duration) *loginRateLimiter {
	return &loginRateLimiter{
		maxFailures: maxFailures,
		window:      window,
		attempts:    make(map[string]loginAttempt),
		now:         time.Now,
	}
}

func (l *loginRateLimiter) blocked(key string) bool {
	if l.maxFailures <= 0 || key == "" {
		return false
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	attempt, ok := l.attempts[key]
	if !ok {
		return false
	}
	if !l.now().Before(attempt.expiresAt) {
		delete(l.attempts, key)
		return false
	}

	return attempt.failures >= l.maxFailures
}

func (l *loginRateLimiter) recordFailure(key string) {
	if l.maxFailures <= 0 || key == "" {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	attempt := l.attempts[key]
	if !now.Before(attempt.expiresAt) {
		attempt = loginAttempt{expiresAt: now.Add(l.window)}
	}
	attempt.failures++
	l.attempts[key] = attempt
}

func (l *loginRateLimiter) reset(key string) {
	if key == "" {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

func loginRateLimitKey(r *http.Request, email string) string {
	return clientIP(r) + "|" + email
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return r.RemoteAddr
}
