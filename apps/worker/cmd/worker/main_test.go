package main

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/hibiken/asynq"
)

func TestLogTask(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := logTask(logger, "notify_request_created")

	if err := handler(context.Background(), asynq.NewTask("test", []byte(`{"ok":true}`))); err != nil {
		t.Fatalf("expected nil error for valid payload, got %v", err)
	}
	if err := handler(context.Background(), asynq.NewTask("test", []byte(`not-json`))); err != nil {
		t.Fatalf("expected nil error for invalid payload, got %v", err)
	}
}
