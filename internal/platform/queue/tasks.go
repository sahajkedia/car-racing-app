package queue

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

const (
	TypeNotifyRequestCreated  = "notify:request_created"
	TypeNotifyRequestAccepted = "notify:request_accepted"
	TypeNotifyMessageCreated  = "notify:message_created"
	TypeModerationReportAdded = "moderation:report_added"
)

type RequestCreatedPayload struct {
	RequestID   uuid.UUID `json:"request_id"`
	SenderID    uuid.UUID `json:"sender_id"`
	RecipientID uuid.UUID `json:"recipient_id"`
}

type RequestAcceptedPayload struct {
	RequestID      uuid.UUID `json:"request_id"`
	ConversationID uuid.UUID `json:"conversation_id"`
	RecipientID    uuid.UUID `json:"recipient_id"`
}

type MessageCreatedPayload struct {
	MessageID       uuid.UUID `json:"message_id"`
	ConversationID  uuid.UUID `json:"conversation_id"`
	SenderID        uuid.UUID `json:"sender_id"`
	RecipientUserID uuid.UUID `json:"recipient_user_id"`
}

type ReportAddedPayload struct {
	ReportID        uuid.UUID `json:"report_id"`
	ReporterID      uuid.UUID `json:"reporter_id"`
	ReportedUserID  uuid.UUID `json:"reported_user_id"`
	ConversationID  uuid.UUID `json:"conversation_id,omitempty"`
	Reason          string    `json:"reason"`
}

type Enqueuer struct {
	client *asynq.Client
}

func NewEnqueuer(client *asynq.Client) *Enqueuer {
	return &Enqueuer{client: client}
}

func (e *Enqueuer) Enqueue(ctx context.Context, taskType string, payload any) error {
	if e == nil || e.client == nil {
		return nil
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = e.client.EnqueueContext(ctx, asynq.NewTask(taskType, body))
	return err
}
