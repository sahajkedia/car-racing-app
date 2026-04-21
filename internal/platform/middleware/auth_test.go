package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	tokenauth "github.com/vjt/spiritualmeet/internal/platform/auth"

	"github.com/google/uuid"
)

func TestRequireAuthRejectsMissingBearer(t *testing.T) {
	handler := RequireAuth(tokenauth.NewTokenManager("secret"))(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}

func TestRequireAuthInjectsUserID(t *testing.T) {
	manager := tokenauth.NewTokenManager("secret")
	userID := uuid.New()
	token, err := manager.Issue(userID)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	handler := RequireAuth(manager)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxUserID, ok := UserID(r.Context())
		if !ok || ctxUserID != userID {
			t.Fatalf("expected %s in context, got %s ok=%v", userID, ctxUserID, ok)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recorder.Code)
	}
}
