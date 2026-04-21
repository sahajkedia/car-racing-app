package app

import (
	"context"

	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
)

type Store interface {
	Ping(ctx context.Context) error
	RecordEvent(ctx context.Context, actorID uuid.UUID, targetUserID *uuid.UUID, conversationID *uuid.UUID, eventType string, payload string) error
	CreateUser(ctx context.Context, email, passwordHash, displayName, gender string) (store.User, error)
	GetUserByEmail(ctx context.Context, email string) (store.User, error)
	GetUserByID(ctx context.Context, userID uuid.UUID) (store.User, error)
	UpsertProfile(ctx context.Context, profile store.Profile) (store.Profile, error)
	UpsertSpiritualProfile(ctx context.Context, profile store.SpiritualProfile) (store.SpiritualProfile, error)
	UpsertDiscoveryPreferences(ctx context.Context, pref store.DiscoveryPreferences) (store.DiscoveryPreferences, error)
	GetDiscoveryContext(ctx context.Context, userID uuid.UUID) (store.DiscoveryContext, error)
	ListEligibleCandidates(ctx context.Context, userID uuid.UUID, gender string, pref store.DiscoveryPreferences, limit int) ([]store.Candidate, error)
	CreateMessageRequest(ctx context.Context, senderID, recipientID uuid.UUID, introMessage string) (store.MessageRequest, error)
	ListInboxRequests(ctx context.Context, recipientID uuid.UUID) ([]store.MessageRequest, error)
	RespondToRequest(ctx context.Context, requestID, recipientID uuid.UUID, accept bool) (store.MessageRequest, *store.Conversation, error)
	ListConversations(ctx context.Context, userID uuid.UUID) ([]store.Conversation, error)
	ListMessages(ctx context.Context, conversationID, userID uuid.UUID, limit int) ([]store.Message, error)
	CreateMessage(ctx context.Context, conversationID, senderID uuid.UUID, body string) (store.Message, uuid.UUID, error)
	CreateBlock(ctx context.Context, blockerID, blockedID uuid.UUID) error
	CreateReport(ctx context.Context, report store.Report) (store.Report, error)
	ListReports(ctx context.Context) ([]store.Report, error)
}

type JobQueue interface {
	Enqueue(ctx context.Context, taskType string, payload any) error
}
