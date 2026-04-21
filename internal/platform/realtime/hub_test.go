package realtime

import (
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestHubAddRemoveAndUpgrader(t *testing.T) {
	hub := NewHub()
	userID := uuid.New()

	hub.Add(userID, nil)
	if len(hub.clients[userID]) != 1 {
		t.Fatalf("expected one client, got %d", len(hub.clients[userID]))
	}

	hub.Remove(userID, nil)
	if _, ok := hub.clients[userID]; ok {
		t.Fatal("expected user entry to be removed after last connection")
	}

	req := httptest.NewRequest("GET", "/", nil)
	if !hub.Upgrader().CheckOrigin(req) {
		t.Fatal("expected upgrader to allow origin")
	}
}

func TestBroadcastIgnoresEmptyClientsAndBadPayload(t *testing.T) {
	hub := NewHub()

	// No clients should be a no-op.
	hub.Broadcast(uuid.New(), Envelope{Type: "noop", Data: "ok"})

	// Non-serializable data should be ignored without panicking.
	hub.Broadcast(uuid.New(), Envelope{Type: "bad", Data: make(chan int)})
}
