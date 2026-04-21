package middleware

import (
	"context"
	"net/http"
	"strings"

	tokenauth "github.com/vjt/spiritualmeet/internal/platform/auth"

	"github.com/google/uuid"
)

type contextKey string

const userIDKey contextKey = "user_id"

func RequireAuth(tokens *tokenauth.TokenManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}

			userID, err := tokens.Parse(strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserID(ctx context.Context) (uuid.UUID, bool) {
	value := ctx.Value(userIDKey)
	userID, ok := value.(uuid.UUID)
	return userID, ok
}

func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}
