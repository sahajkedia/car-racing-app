package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
)

func TestHandleRegister(t *testing.T) {
	var capturedEmail string
	server, _, _ := newTestServer(t, mockStore{
		createUserFn: func(_ context.Context, email, passwordHash, displayName, gender string) (store.User, error) {
			capturedEmail = email
			if passwordHash == "" || passwordHash == "secret" {
				t.Fatalf("expected hashed password, got %q", passwordHash)
			}
			return store.User{ID: uuid.New(), Email: email, DisplayName: displayName, Gender: gender}, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":" TEST@EXAMPLE.COM ","password":"secret","display_name":"Asha","gender":"Female"}`))
	recorder := httptest.NewRecorder()
	server.handleRegister(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if capturedEmail != "test@example.com" {
		t.Fatalf("expected normalized email, got %q", capturedEmail)
	}

	var body map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["token"] == "" {
		t.Fatal("expected token in response")
	}
}

func TestHandleLogin(t *testing.T) {
	hash, err := hashPassword("secret")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	server, _, _ := newTestServer(t, mockStore{
		getUserByEmailFn: func(_ context.Context, email string) (store.User, error) {
			return store.User{
				ID:           uuid.New(),
				Email:        email,
				DisplayName:  "Asha",
				PasswordHash: hash,
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"ASHA@EXAMPLE.COM","password":"secret"}`))
	recorder := httptest.NewRecorder()
	server.handleLogin(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"asha@example.com","password":"wrong"}`))
	recorder = httptest.NewRecorder()
	server.handleLogin(recorder, req)
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for bad credentials, got %d", recorder.Code)
	}
}
