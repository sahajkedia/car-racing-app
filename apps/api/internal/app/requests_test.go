package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	apimiddleware "github.com/vjt/spiritualmeet/internal/platform/middleware"
)

func TestHandleCreateRequest(t *testing.T) {
	userID := uuid.New()
	recipientID := uuid.New()
	server, _, queue := newTestServer(t, mockStore{
		createMessageRequestFn: func(_ context.Context, senderID, gotRecipientID uuid.UUID, intro string) (store.MessageRequest, error) {
			if senderID != userID || gotRecipientID != recipientID || intro != "hello" {
				t.Fatalf("unexpected request args: sender=%s recipient=%s intro=%q", senderID, gotRecipientID, intro)
			}
			return store.MessageRequest{
				ID:           uuid.New(),
				SenderID:     senderID,
				RecipientID:  gotRecipientID,
				IntroMessage: intro,
				Status:       "pending",
				CreatedAt:    time.Now(),
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/message-requests", strings.NewReader(`{"recipient_id":"`+recipientID.String()+`","intro_message":"hello"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleCreateRequest(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if len(queue.tasks) != 1 {
		t.Fatalf("expected one async task, got %d", len(queue.tasks))
	}
}

func TestRespondToRequest(t *testing.T) {
	userID := uuid.New()
	senderID := uuid.New()
	requestID := uuid.New()
	conversationID := uuid.New()
	server, _, queue := newTestServer(t, mockStore{
		respondToRequestFn: func(_ context.Context, gotRequestID, recipientID uuid.UUID, accept bool) (store.MessageRequest, *store.Conversation, error) {
			if gotRequestID != requestID || recipientID != userID || !accept {
				t.Fatalf("unexpected respond args: request=%s recipient=%s accept=%v", gotRequestID, recipientID, accept)
			}
			return store.MessageRequest{
					ID:            requestID,
					SenderID:      senderID,
					RecipientID:   userID,
					Status:        "accepted",
					ConversationID: &conversationID,
				}, &store.Conversation{ID: conversationID}, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/message-requests/"+requestID.String()+"/accept", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("requestID", requestID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	recorder := httptest.NewRecorder()
	server.handleAcceptRequest(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if len(queue.tasks) != 1 {
		t.Fatalf("expected one async task, got %d", len(queue.tasks))
	}
}
