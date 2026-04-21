package app

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/hibiken/asynq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	tokenauth "github.com/vjt/spiritualmeet/internal/platform/auth"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
	apimiddleware "github.com/vjt/spiritualmeet/internal/platform/middleware"
	"github.com/vjt/spiritualmeet/internal/platform/queue"
	"github.com/vjt/spiritualmeet/internal/platform/realtime"
	"golang.org/x/crypto/bcrypt"
)

type Server struct {
	logger *slog.Logger
	store  Store
	redis  *redis.Client
	tokens *tokenauth.TokenManager
	queue  JobQueue
	hub    *realtime.Hub
	limits RateLimits
}

type RateLimits struct {
	AuthAttempts    int
	MessageRequests int
	Messages        int
}

func NewServer(logger *slog.Logger, store Store, redisClient *redis.Client, tokenManager *tokenauth.TokenManager, asynqClient *asynq.Client, hub *realtime.Hub, limits RateLimits) *Server {
	return &Server{
		logger: logger,
		store:  store,
		redis:  redisClient,
		tokens: tokenManager,
		queue:  queue.NewEnqueuer(asynqClient),
		hub:    hub,
		limits: limits,
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(30 * time.Second))

	r.Get("/healthz", s.handleHealth)
	r.Get("/readyz", s.handleReady)
	r.Handle("/metrics", promhttp.Handler())

	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.RedisRateLimit(s.redis, "auth", s.limits.AuthAttempts, time.Minute))
		r.Post("/v1/auth/register", s.handleRegister)
		r.Post("/v1/auth/login", s.handleLogin)
	})

	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.RequireAuth(s.tokens))
		r.Get("/v1/me", s.handleMe)
		r.Put("/v1/me/profile", s.handleUpsertProfile)
		r.Put("/v1/me/spiritual-profile", s.handleUpsertSpiritualProfile)
		r.Put("/v1/me/discovery-preferences", s.handleUpsertDiscoveryPreferences)
		r.Get("/v1/discovery/candidates", s.handleListCandidates)
		r.Get("/v1/message-requests/inbox", s.handleInboxRequests)
		r.With(apimiddleware.RedisRateLimit(s.redis, "message_requests", s.limits.MessageRequests, time.Minute)).
			Post("/v1/message-requests", s.handleCreateRequest)
		r.Post("/v1/message-requests/{requestID}/accept", s.handleAcceptRequest)
		r.Post("/v1/message-requests/{requestID}/reject", s.handleRejectRequest)
		r.Get("/v1/conversations", s.handleListConversations)
		r.Get("/v1/conversations/{conversationID}/messages", s.handleListMessages)
		r.With(apimiddleware.RedisRateLimit(s.redis, "messages", s.limits.Messages, time.Minute)).
			Post("/v1/conversations/{conversationID}/messages", s.handleCreateMessage)
		r.Post("/v1/blocks", s.handleCreateBlock)
		r.Post("/v1/reports", s.handleCreateReport)
		r.Get("/v1/admin/reports", s.handleListReports)
		r.Get("/v1/ws", s.handleWebSocket)
	})

	return r
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Ping(r.Context()); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "postgres unavailable")
		return
	}
	if err := s.redis.Ping(r.Context()).Err(); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "redis unavailable")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) currentUserID(r *http.Request) (uuid.UUID, bool) {
	return apimiddleware.UserID(r.Context())
}

func (s *Server) requireBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := httpx.Decode(r, dst); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

func (s *Server) logEvent(ctx context.Context, actorID uuid.UUID, targetUserID *uuid.UUID, conversationID *uuid.UUID, eventType string, payload any) {
	body, _ := json.Marshal(payload)
	if err := s.store.RecordEvent(ctx, actorID, targetUserID, conversationID, eventType, string(body)); err != nil {
		s.logger.Warn("record event failed", "event_type", eventType, "error", err)
	}
}

func (s *Server) authFromRequest(r *http.Request) (uuid.UUID, error) {
	header := r.Header.Get("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return s.tokens.Parse(strings.TrimPrefix(header, "Bearer "))
	}
	raw := r.URL.Query().Get("token")
	return s.tokens.Parse(raw)
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func checkPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, err := s.authFromRequest(r)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid token")
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "websocket upgrade failed")
		return
	}

	s.hub.Add(userID, conn)
	defer func() {
		s.hub.Remove(userID, conn)
		_ = conn.Close()
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}
