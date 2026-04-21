package realtime

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Envelope struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type Hub struct {
	mu       sync.RWMutex
	clients  map[uuid.UUID]map[*websocket.Conn]struct{}
	upgrader websocket.Upgrader
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[uuid.UUID]map[*websocket.Conn]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (h *Hub) Add(userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*websocket.Conn]struct{})
	}
	h.clients[userID][conn] = struct{}{}
}

func (h *Hub) Remove(userID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		return
	}
	delete(h.clients[userID], conn)
	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}
}

func (h *Hub) Broadcast(userID uuid.UUID, envelope Envelope) {
	h.mu.RLock()
	conns := h.clients[userID]
	h.mu.RUnlock()
	if len(conns) == 0 {
		return
	}

	body, err := json.Marshal(envelope)
	if err != nil {
		return
	}

	for conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, body); err != nil {
			_ = conn.Close()
			h.Remove(userID, conn)
		}
	}
}

func (h *Hub) Upgrader() websocket.Upgrader {
	return h.upgrader
}
