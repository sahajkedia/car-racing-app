package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"github.com/vjt/spiritualmeet/apps/api/internal/app"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	tokenauth "github.com/vjt/spiritualmeet/internal/platform/auth"
	"github.com/vjt/spiritualmeet/internal/platform/config"
	"github.com/vjt/spiritualmeet/internal/platform/database"
	"github.com/vjt/spiritualmeet/internal/platform/redisconn"
	"github.com/vjt/spiritualmeet/internal/platform/realtime"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	ctx := context.Background()

	db, err := database.Open(ctx, cfg.PostgresDSN)
	if err != nil {
		logger.Error("postgres connect failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if cfg.AutoMigrate {
		if err := database.RunMigrations(ctx, db, "apps/api/migrations"); err != nil {
			logger.Error("migrations failed", "error", err)
			os.Exit(1)
		}
	}

	redisClient := redis.NewClient(redisconn.ClientOptions(cfg))
	defer redisClient.Close()

	asynqClient := asynq.NewClient(redisconn.AsynqRedisOpt(cfg))
	defer asynqClient.Close()

	server := app.NewServer(
		logger,
		store.New(db),
		redisClient,
		tokenauth.NewTokenManager(cfg.JWTSecret),
		asynqClient,
		realtime.NewHub(),
		app.RateLimits{
			AuthAttempts:    cfg.AuthAttemptsPerMinute,
			MessageRequests: cfg.MessageRequestsPerMinute,
			Messages:        cfg.MessagesPerMinute,
		},
		cfg.AllowedOrigins,
	)

	httpServer := newHTTPServer(cfg.HTTPAddr, server.Router())

	errCh := make(chan error, 1)
	go func() {
		logger.Info("api listening", "addr", cfg.HTTPAddr)
		errCh <- httpServer.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-stop:
		logger.Info("shutting down api", "signal", sig.String())
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			logger.Error("http server failed", "error", err)
			os.Exit(1)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown failed", "error", err)
		os.Exit(1)
	}
}

func newHTTPServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}
}
