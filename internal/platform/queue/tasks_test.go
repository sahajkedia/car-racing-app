package queue

import (
	"context"
	"testing"
)

func TestEnqueueReturnsNilWhenClientIsMissing(t *testing.T) {
	var enqueuer *Enqueuer
	if err := enqueuer.Enqueue(context.Background(), TypeNotifyRequestCreated, map[string]string{"ok": "true"}); err != nil {
		t.Fatalf("expected nil error for nil enqueuer, got %v", err)
	}

	enqueuer = NewEnqueuer(nil)
	if err := enqueuer.Enqueue(context.Background(), TypeNotifyRequestCreated, map[string]string{"ok": "true"}); err != nil {
		t.Fatalf("expected nil error for nil client, got %v", err)
	}
}

func TestNewEnqueuerKeepsNilClient(t *testing.T) {
	enqueuer := NewEnqueuer(nil)
	if enqueuer == nil {
		t.Fatal("expected enqueuer instance")
	}
	if enqueuer.client != nil {
		t.Fatal("expected nil client to be preserved")
	}
}
