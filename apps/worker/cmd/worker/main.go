package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"

	"github.com/hibiken/asynq"
	"github.com/vjt/spiritualmeet/internal/platform/config"
	"github.com/vjt/spiritualmeet/internal/platform/queue"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	server := asynq.NewServer(
		asynq.RedisClientOpt{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
		},
		asynq.Config{
			Concurrency: 10,
		},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TypeNotifyRequestCreated, logTask(logger, "notify_request_created"))
	mux.HandleFunc(queue.TypeNotifyRequestAccepted, logTask(logger, "notify_request_accepted"))
	mux.HandleFunc(queue.TypeNotifyMessageCreated, logTask(logger, "notify_message_created"))
	mux.HandleFunc(queue.TypeModerationReportAdded, logTask(logger, "moderation_report_added"))

	if err := server.Run(mux); err != nil {
		logger.Error("worker failed", "error", err)
		os.Exit(1)
	}
}

func logTask(logger *slog.Logger, taskName string) func(context.Context, *asynq.Task) error {
	return func(_ context.Context, task *asynq.Task) error {
		var payload map[string]any
		_ = json.Unmarshal(task.Payload(), &payload)
		logger.Info("task processed", "task", taskName, "payload", payload)
		return nil
	}
}
