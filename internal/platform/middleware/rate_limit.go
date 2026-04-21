package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

func RedisRateLimit(client *redis.Client, scope string, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if client == nil || limit <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			key := fmt.Sprintf("ratelimit:%s:%s", scope, subjectForRateLimit(r))
			ctx := r.Context()
			count, err := client.Incr(ctx, key).Result()
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			if count == 1 {
				_ = client.Expire(ctx, key, window).Err()
			}
			if count > int64(limit) {
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func subjectForRateLimit(r *http.Request) string {
	if userID, ok := UserID(r.Context()); ok {
		return userID.String()
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func IncrementUnread(ctx context.Context, client *redis.Client, userID, conversationID string) {
	if client == nil {
		return
	}
	key := fmt.Sprintf("unread:%s:%s", userID, conversationID)
	_ = client.Incr(ctx, key).Err()
	_ = client.Expire(ctx, key, 30*24*time.Hour).Err()
}

func ClearUnread(ctx context.Context, client *redis.Client, userID, conversationID string) {
	if client == nil {
		return
	}
	key := fmt.Sprintf("unread:%s:%s", userID, conversationID)
	_ = client.Del(ctx, key).Err()
}
