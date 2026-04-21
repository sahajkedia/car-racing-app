package app

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestHandleHealth(t *testing.T) {
	server, _, _ := newTestServer(t, mockStore{})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	server.handleHealth(recorder, req)

	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected response: code=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestHandleReady(t *testing.T) {
	server, mini, _ := newTestServer(t, mockStore{})

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	server.handleReady(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	mini.Close()

	recorder = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
	server.handleReady(recorder, req)
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when redis is down, got %d", recorder.Code)
	}

	server, _, _ = newTestServer(t, mockStore{
		pingFn: func(context.Context) error { return errors.New("db down") },
	})
	recorder = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
	server.handleReady(recorder, req)
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when postgres is down, got %d", recorder.Code)
	}
}

func TestAuthHelpers(t *testing.T) {
	server, _, _ := newTestServer(t, mockStore{})
	userID := uuid.New()
	token, err := server.tokens.Issue(userID)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	parsed, err := server.authFromRequest(req)
	if err != nil || parsed != userID {
		t.Fatalf("expected bearer token to parse, got user=%s err=%v", parsed, err)
	}

	req = httptest.NewRequest(http.MethodGet, "/?token="+token, nil)
	parsed, err = server.authFromRequest(req)
	if err != nil || parsed != userID {
		t.Fatalf("expected query token to parse, got user=%s err=%v", parsed, err)
	}
}

func TestPasswordHelpersAndWebsocketAuth(t *testing.T) {
	hash, err := hashPassword("secret")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if err := checkPassword(hash, "secret"); err != nil {
		t.Fatalf("expected password to match: %v", err)
	}
	if err := checkPassword(hash, "wrong"); err == nil {
		t.Fatal("expected wrong password to fail")
	}

	server, _, _ := newTestServer(t, mockStore{})
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/ws", nil)
	server.handleWebSocket(recorder, req)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for websocket without token, got %d", recorder.Code)
	}
}
