package middleware

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"
)

// RateLimiter implements a simple in-memory token bucket rate limiter
// For production, consider using Redis-based rate limiting for distributed systems
type RateLimiter struct {
	maxMessages int
	windowSecs  int
	buckets     map[string]*bucket
	mu          sync.RWMutex
	log         *zap.Logger
}

type bucket struct {
	count     int
	resetTime time.Time
}

func NewRateLimiter(maxMessages int, windowSecs int, log *zap.Logger) *RateLimiter {
	rl := &RateLimiter{
		maxMessages: maxMessages,
		windowSecs:  windowSecs,
		buckets:     make(map[string]*bucket),
		log:         log,
	}

	// Start cleanup goroutine to remove old buckets
	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) Allow(ctx context.Context, userID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	key := fmt.Sprintf("user:%s", userID)

	b, exists := rl.buckets[key]
	if !exists || now.After(b.resetTime) {
		// Create new bucket or reset expired one
		rl.buckets[key] = &bucket{
			count:     1,
			resetTime: now.Add(time.Duration(rl.windowSecs) * time.Second),
		}
		return true
	}

	// Check if limit exceeded
	if b.count >= rl.maxMessages {
		rl.log.Debug("Rate limit exceeded",
			zap.String("userId", userID),
			zap.Int("count", b.count),
			zap.Int("maxMessages", rl.maxMessages),
		)
		return false
	}

	// Increment count
	b.count++
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, b := range rl.buckets {
			if now.After(b.resetTime.Add(1 * time.Minute)) {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}
