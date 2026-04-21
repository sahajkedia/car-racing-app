package app

import (
	"context"
	"errors"
	"log/slog"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	tokenauth "github.com/vjt/spiritualmeet/internal/platform/auth"
	"github.com/vjt/spiritualmeet/internal/platform/realtime"
)

var errUnexpectedStoreCall = errors.New("unexpected store call")

type mockStore struct {
	pingFn                      func(context.Context) error
	recordEventFn               func(context.Context, uuid.UUID, *uuid.UUID, *uuid.UUID, string, string) error
	createUserFn                func(context.Context, string, string, string, string) (store.User, error)
	getUserByEmailFn            func(context.Context, string) (store.User, error)
	getUserByIDFn               func(context.Context, uuid.UUID) (store.User, error)
	upsertProfileFn             func(context.Context, store.Profile) (store.Profile, error)
	upsertSpiritualProfileFn    func(context.Context, store.SpiritualProfile) (store.SpiritualProfile, error)
	upsertDiscoveryPrefsFn      func(context.Context, store.DiscoveryPreferences) (store.DiscoveryPreferences, error)
	getDiscoveryContextFn       func(context.Context, uuid.UUID) (store.DiscoveryContext, error)
	listEligibleCandidatesFn    func(context.Context, uuid.UUID, string, store.DiscoveryPreferences, int) ([]store.Candidate, error)
	createMessageRequestFn      func(context.Context, uuid.UUID, uuid.UUID, string) (store.MessageRequest, error)
	listInboxRequestsFn         func(context.Context, uuid.UUID) ([]store.MessageRequest, error)
	respondToRequestFn          func(context.Context, uuid.UUID, uuid.UUID, bool) (store.MessageRequest, *store.Conversation, error)
	listConversationsFn         func(context.Context, uuid.UUID) ([]store.Conversation, error)
	listMessagesFn              func(context.Context, uuid.UUID, uuid.UUID, int) ([]store.Message, error)
	createMessageFn             func(context.Context, uuid.UUID, uuid.UUID, string) (store.Message, uuid.UUID, error)
	createBlockFn               func(context.Context, uuid.UUID, uuid.UUID) error
	createReportFn              func(context.Context, store.Report) (store.Report, error)
	listReportsFn               func(context.Context) ([]store.Report, error)
}

func (m mockStore) Ping(ctx context.Context) error {
	if m.pingFn != nil {
		return m.pingFn(ctx)
	}
	return nil
}

func (m mockStore) RecordEvent(ctx context.Context, actorID uuid.UUID, targetUserID *uuid.UUID, conversationID *uuid.UUID, eventType string, payload string) error {
	if m.recordEventFn != nil {
		return m.recordEventFn(ctx, actorID, targetUserID, conversationID, eventType, payload)
	}
	return nil
}

func (m mockStore) CreateUser(ctx context.Context, email, passwordHash, displayName, gender string) (store.User, error) {
	if m.createUserFn != nil {
		return m.createUserFn(ctx, email, passwordHash, displayName, gender)
	}
	return store.User{}, errUnexpectedStoreCall
}

func (m mockStore) GetUserByEmail(ctx context.Context, email string) (store.User, error) {
	if m.getUserByEmailFn != nil {
		return m.getUserByEmailFn(ctx, email)
	}
	return store.User{}, errUnexpectedStoreCall
}

func (m mockStore) GetUserByID(ctx context.Context, userID uuid.UUID) (store.User, error) {
	if m.getUserByIDFn != nil {
		return m.getUserByIDFn(ctx, userID)
	}
	return store.User{}, errUnexpectedStoreCall
}

func (m mockStore) UpsertProfile(ctx context.Context, profile store.Profile) (store.Profile, error) {
	if m.upsertProfileFn != nil {
		return m.upsertProfileFn(ctx, profile)
	}
	return store.Profile{}, errUnexpectedStoreCall
}

func (m mockStore) UpsertSpiritualProfile(ctx context.Context, profile store.SpiritualProfile) (store.SpiritualProfile, error) {
	if m.upsertSpiritualProfileFn != nil {
		return m.upsertSpiritualProfileFn(ctx, profile)
	}
	return store.SpiritualProfile{}, errUnexpectedStoreCall
}

func (m mockStore) UpsertDiscoveryPreferences(ctx context.Context, pref store.DiscoveryPreferences) (store.DiscoveryPreferences, error) {
	if m.upsertDiscoveryPrefsFn != nil {
		return m.upsertDiscoveryPrefsFn(ctx, pref)
	}
	return store.DiscoveryPreferences{}, errUnexpectedStoreCall
}

func (m mockStore) GetDiscoveryContext(ctx context.Context, userID uuid.UUID) (store.DiscoveryContext, error) {
	if m.getDiscoveryContextFn != nil {
		return m.getDiscoveryContextFn(ctx, userID)
	}
	return store.DiscoveryContext{}, errUnexpectedStoreCall
}

func (m mockStore) ListEligibleCandidates(ctx context.Context, userID uuid.UUID, gender string, pref store.DiscoveryPreferences, limit int) ([]store.Candidate, error) {
	if m.listEligibleCandidatesFn != nil {
		return m.listEligibleCandidatesFn(ctx, userID, gender, pref, limit)
	}
	return nil, errUnexpectedStoreCall
}

func (m mockStore) CreateMessageRequest(ctx context.Context, senderID, recipientID uuid.UUID, introMessage string) (store.MessageRequest, error) {
	if m.createMessageRequestFn != nil {
		return m.createMessageRequestFn(ctx, senderID, recipientID, introMessage)
	}
	return store.MessageRequest{}, errUnexpectedStoreCall
}

func (m mockStore) ListInboxRequests(ctx context.Context, recipientID uuid.UUID) ([]store.MessageRequest, error) {
	if m.listInboxRequestsFn != nil {
		return m.listInboxRequestsFn(ctx, recipientID)
	}
	return nil, errUnexpectedStoreCall
}

func (m mockStore) RespondToRequest(ctx context.Context, requestID, recipientID uuid.UUID, accept bool) (store.MessageRequest, *store.Conversation, error) {
	if m.respondToRequestFn != nil {
		return m.respondToRequestFn(ctx, requestID, recipientID, accept)
	}
	return store.MessageRequest{}, nil, errUnexpectedStoreCall
}

func (m mockStore) ListConversations(ctx context.Context, userID uuid.UUID) ([]store.Conversation, error) {
	if m.listConversationsFn != nil {
		return m.listConversationsFn(ctx, userID)
	}
	return nil, errUnexpectedStoreCall
}

func (m mockStore) ListMessages(ctx context.Context, conversationID, userID uuid.UUID, limit int) ([]store.Message, error) {
	if m.listMessagesFn != nil {
		return m.listMessagesFn(ctx, conversationID, userID, limit)
	}
	return nil, errUnexpectedStoreCall
}

func (m mockStore) CreateMessage(ctx context.Context, conversationID, senderID uuid.UUID, body string) (store.Message, uuid.UUID, error) {
	if m.createMessageFn != nil {
		return m.createMessageFn(ctx, conversationID, senderID, body)
	}
	return store.Message{}, uuid.Nil, errUnexpectedStoreCall
}

func (m mockStore) CreateBlock(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if m.createBlockFn != nil {
		return m.createBlockFn(ctx, blockerID, blockedID)
	}
	return errUnexpectedStoreCall
}

func (m mockStore) CreateReport(ctx context.Context, report store.Report) (store.Report, error) {
	if m.createReportFn != nil {
		return m.createReportFn(ctx, report)
	}
	return store.Report{}, errUnexpectedStoreCall
}

func (m mockStore) ListReports(ctx context.Context) ([]store.Report, error) {
	if m.listReportsFn != nil {
		return m.listReportsFn(ctx)
	}
	return nil, errUnexpectedStoreCall
}

type mockQueue struct {
	tasks []string
}

func (m *mockQueue) Enqueue(_ context.Context, taskType string, _ any) error {
	m.tasks = append(m.tasks, taskType)
	return nil
}

func newTestServer(t *testing.T, st Store) (*Server, *miniredis.Miniredis, *mockQueue) {
	t.Helper()

	mini := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = redisClient.Close() })

	queue := &mockQueue{}
	server := &Server{
		logger: slog.New(slog.NewTextHandler(httptest.NewRecorder(), nil)),
		store:  st,
		redis:  redisClient,
		tokens: tokenauth.NewTokenManager("test-secret"),
		queue:  queue,
		hub:    realtime.NewHub(),
	}
	return server, mini, queue
}
