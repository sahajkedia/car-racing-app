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

func TestHandleListConversationsAndMessages(t *testing.T) {
	userID := uuid.New()
	conversationID := uuid.New()
	server, mini, _ := newTestServer(t, mockStore{
		listConversationsFn: func(_ context.Context, id uuid.UUID) ([]store.Conversation, error) {
			return []store.Conversation{{ID: conversationID, OtherUserID: uuid.New()}}, nil
		},
		listMessagesFn: func(_ context.Context, gotConversationID, gotUserID uuid.UUID, limit int) ([]store.Message, error) {
			if gotConversationID != conversationID || gotUserID != userID || limit != 20 {
				t.Fatalf("unexpected list message args: conversation=%s user=%s limit=%d", gotConversationID, gotUserID, limit)
			}
			return []store.Message{{ID: uuid.New(), ConversationID: conversationID, SenderID: userID, Body: "hi", CreatedAt: time.Now()}}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/conversations", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleListConversations(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	mini.Set("unread:"+userID.String()+":"+conversationID.String(), "3")
	req = httptest.NewRequest(http.MethodGet, "/v1/conversations/"+conversationID.String()+"/messages?limit=20", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("conversationID", conversationID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	recorder = httptest.NewRecorder()
	server.handleListMessages(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if mini.Exists("unread:" + userID.String() + ":" + conversationID.String()) {
		t.Fatal("expected unread key to be cleared")
	}
}

func TestHandleCreateMessage(t *testing.T) {
	userID := uuid.New()
	recipientID := uuid.New()
	conversationID := uuid.New()
	server, mini, queue := newTestServer(t, mockStore{
		createMessageFn: func(_ context.Context, gotConversationID, gotUserID uuid.UUID, body string) (store.Message, uuid.UUID, error) {
			if gotConversationID != conversationID || gotUserID != userID || body != "hello" {
				t.Fatalf("unexpected create message args")
			}
			return store.Message{ID: uuid.New(), ConversationID: conversationID, SenderID: userID, Body: body, CreatedAt: time.Now()}, recipientID, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/conversations/"+conversationID.String()+"/messages", strings.NewReader(`{"body":"hello"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("conversationID", conversationID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	recorder := httptest.NewRecorder()
	server.handleCreateMessage(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !mini.Exists("unread:" + recipientID.String() + ":" + conversationID.String()) {
		t.Fatal("expected unread counter to be incremented")
	}
	if len(queue.tasks) != 1 {
		t.Fatalf("expected one async task, got %d", len(queue.tasks))
	}
}
