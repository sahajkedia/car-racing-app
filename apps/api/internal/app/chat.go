package app

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
	apimiddleware "github.com/vjt/spiritualmeet/internal/platform/middleware"
	"github.com/vjt/spiritualmeet/internal/platform/queue"
	"github.com/vjt/spiritualmeet/internal/platform/realtime"
)

type createMessageBody struct {
	Body string `json:"body"`
}

func (s *Server) handleListConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	conversations, err := s.store.ListConversations(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list conversations")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"conversations": conversations})
}

func (s *Server) handleListMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	conversationID, err := uuid.Parse(chi.URLParam(r, "conversationID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	messages, err := s.store.ListMessages(r.Context(), conversationID, userID, limit)
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "could not list messages")
		return
	}

	apimiddleware.ClearUnread(r.Context(), s.redis, userID.String(), conversationID.String())
	httpx.JSON(w, http.StatusOK, map[string]any{"messages": messages})
}

func (s *Server) handleCreateMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	conversationID, err := uuid.Parse(chi.URLParam(r, "conversationID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	var req createMessageBody
	if !s.requireBody(w, r, &req) {
		return
	}
	if req.Body == "" {
		httpx.Error(w, http.StatusBadRequest, "body is required")
		return
	}

	message, recipientID, err := s.store.CreateMessage(r.Context(), conversationID, userID, req.Body)
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "could not create message")
		return
	}

	apimiddleware.IncrementUnread(r.Context(), s.redis, recipientID.String(), conversationID.String())
	s.logEvent(r.Context(), userID, &recipientID, &conversationID, "message.created", message)
	_ = s.queue.Enqueue(r.Context(), queue.TypeNotifyMessageCreated, queue.MessageCreatedPayload{
		MessageID:       message.ID,
		ConversationID:  conversationID,
		SenderID:        userID,
		RecipientUserID: recipientID,
	})
	s.hub.Broadcast(recipientID, realtime.Envelope{
		Type: "message.created",
		Data: message,
	})

	httpx.JSON(w, http.StatusCreated, message)
}
