package app

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
	"github.com/vjt/spiritualmeet/internal/platform/queue"
	"github.com/vjt/spiritualmeet/internal/platform/realtime"
)

type createRequestBody struct {
	RecipientID  uuid.UUID `json:"recipient_id"`
	IntroMessage string    `json:"intro_message"`
}

func (s *Server) handleCreateRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req createRequestBody
	if !s.requireBody(w, r, &req) {
		return
	}
	if req.RecipientID == uuid.Nil || req.IntroMessage == "" {
		httpx.Error(w, http.StatusBadRequest, "recipient_id and intro_message are required")
		return
	}
	if req.RecipientID == userID {
		httpx.Error(w, http.StatusBadRequest, "cannot message yourself")
		return
	}

	messageRequest, err := s.store.CreateMessageRequest(r.Context(), userID, req.RecipientID, req.IntroMessage)
	if err != nil {
		httpx.Error(w, http.StatusConflict, "could not create request")
		return
	}

	s.logEvent(r.Context(), userID, &req.RecipientID, nil, "message_request.created", req)
	_ = s.queue.Enqueue(r.Context(), queue.TypeNotifyRequestCreated, queue.RequestCreatedPayload{
		RequestID:   messageRequest.ID,
		SenderID:    userID,
		RecipientID: req.RecipientID,
	})
	s.hub.Broadcast(req.RecipientID, realtime.Envelope{
		Type: "message_request.created",
		Data: messageRequest,
	})

	httpx.JSON(w, http.StatusCreated, messageRequest)
}

func (s *Server) handleInboxRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	requests, err := s.store.ListInboxRequests(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list requests")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (s *Server) handleAcceptRequest(w http.ResponseWriter, r *http.Request) {
	s.respondToRequest(w, r, true)
}

func (s *Server) handleRejectRequest(w http.ResponseWriter, r *http.Request) {
	s.respondToRequest(w, r, false)
}

func (s *Server) respondToRequest(w http.ResponseWriter, r *http.Request, accept bool) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "requestID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request id")
		return
	}

	request, conversation, err := s.store.RespondToRequest(r.Context(), requestID, userID, accept)
	if err != nil {
		httpx.Error(w, http.StatusConflict, err.Error())
		return
	}

	eventType := "message_request.rejected"
	if accept && conversation != nil {
		eventType = "message_request.accepted"
		s.hub.Broadcast(request.SenderID, realtime.Envelope{
			Type: "conversation.created",
			Data: conversation,
		})
		_ = s.queue.Enqueue(r.Context(), queue.TypeNotifyRequestAccepted, queue.RequestAcceptedPayload{
			RequestID:      request.ID,
			ConversationID: conversation.ID,
			RecipientID:    userID,
		})
	}

	s.logEvent(r.Context(), userID, &request.SenderID, request.ConversationID, eventType, request)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"request":      request,
		"conversation": conversation,
	})
}
