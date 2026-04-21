package app

import (
	"errors"
	"net/http"
	"strings"

	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
)

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Gender      string `json:"gender"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if !s.requireBody(w, r, &req) {
		return
	}
	if req.Email == "" || req.Password == "" || req.DisplayName == "" || req.Gender == "" {
		httpx.Error(w, http.StatusBadRequest, "email, password, display_name, and gender are required")
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	hash, err := hashPassword(req.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := s.store.CreateUser(r.Context(), req.Email, hash, req.DisplayName, strings.ToLower(req.Gender))
	if err != nil {
		httpx.Error(w, http.StatusConflict, "user already exists")
		return
	}

	token, err := s.tokens.Issue(user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	s.logEvent(r.Context(), user.ID, nil, nil, "auth.registered", map[string]any{"email": user.Email})
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  user,
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !s.requireBody(w, r, &req) {
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "login failed")
		return
	}

	if err := checkPassword(user.PasswordHash, req.Password); err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := s.tokens.Issue(user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not issue token")
		return
	}

	s.logEvent(r.Context(), user.ID, nil, nil, "auth.logged_in", map[string]any{"email": user.Email})
	httpx.JSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  user,
	})
}
