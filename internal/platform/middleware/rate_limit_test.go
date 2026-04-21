package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

func TestRedisRateLimitBlocksAfterLimit(t *testing.T) {
	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	calls := 0
	handler := RedisRateLimit(client, "auth", 1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "127.0.0.1:1234"

	first := httptest.NewRecorder()
	handler.ServeHTTP(first, req)
	if first.Code != http.StatusNoContent {
		t.Fatalf("expected first request to pass, got %d", first.Code)
	}

	second := httptest.NewRecorder()
	handler.ServeHTTP(second, req)
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request to be limited, got %d", second.Code)
	}
	if calls != 1 {
		t.Fatalf("expected wrapped handler to run once, got %d", calls)
	}
}

func TestSubjectForRateLimitPrefersUserID(t *testing.T) {
	userID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "127.0.0.1:8080"
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, userID))

	if got := subjectForRateLimit(req); got != userID.String() {
		t.Fatalf("expected subject %q, got %q", userID.String(), got)
	}
}

func TestIncrementAndClearUnread(t *testing.T) {
	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	ctx := context.Background()
	IncrementUnread(ctx, client, "user-1", "conversation-1")

	value, err := client.Get(ctx, "unread:user-1:conversation-1").Result()
	if err != nil || value != "1" {
		t.Fatalf("expected unread count to be 1, got value=%q err=%v", value, err)
	}

	ClearUnread(ctx, client, "user-1", "conversation-1")
	if mini.Exists("unread:user-1:conversation-1") {
		t.Fatal("expected unread key to be removed")
	}
}
