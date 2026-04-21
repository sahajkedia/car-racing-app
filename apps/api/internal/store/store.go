package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

type User struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	DisplayName   string    `json:"display_name"`
	Gender        string    `json:"gender"`
	IsAdmin       bool      `json:"is_admin"`
	AccountStatus string    `json:"account_status"`
	IsVisible     bool      `json:"is_visible"`
	CreatedAt     time.Time `json:"created_at"`
	PasswordHash  string    `json:"-"`
}

type Profile struct {
	UserID        uuid.UUID `json:"user_id"`
	Bio           string    `json:"bio"`
	City          string    `json:"city"`
	Country       string    `json:"country"`
	Language      string    `json:"language"`
	Age           int       `json:"age"`
	Occupation    string    `json:"occupation"`
	LookingFor    string    `json:"looking_for"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	DisplayName   string    `json:"display_name,omitempty"`
	Gender        string    `json:"gender,omitempty"`
	AccountStatus string    `json:"account_status,omitempty"`
	IsVisible     bool      `json:"is_visible,omitempty"`
}

type SpiritualProfile struct {
	UserID           uuid.UUID `json:"user_id"`
	Tradition        string    `json:"tradition"`
	Values           []string  `json:"values"`
	Practices        []string  `json:"practices"`
	CommunityStyle   string    `json:"community_style"`
	LifestyleChoices []string  `json:"lifestyle_choices"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type DiscoveryPreferences struct {
	UserID            uuid.UUID `json:"user_id"`
	MinAge            int       `json:"min_age"`
	MaxAge            int       `json:"max_age"`
	MaxDistanceKM     int       `json:"max_distance_km"`
	Cities            []string  `json:"cities"`
	Languages         []string  `json:"languages"`
	SpiritualValues   []string  `json:"spiritual_values"`
	CommunityStyles   []string  `json:"community_styles"`
	PreferredTraditon string    `json:"preferred_tradition"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type DiscoveryContext struct {
	User              User                 `json:"user"`
	Profile           Profile              `json:"profile"`
	SpiritualProfile  SpiritualProfile     `json:"spiritual_profile"`
	DiscoverySettings DiscoveryPreferences `json:"discovery_settings"`
}

type Candidate struct {
	UserID         uuid.UUID `json:"user_id"`
	DisplayName    string    `json:"display_name"`
	Gender         string    `json:"gender"`
	Age            int       `json:"age"`
	City           string    `json:"city"`
	Country        string    `json:"country"`
	Language       string    `json:"language"`
	Bio            string    `json:"bio"`
	Tradition      string    `json:"tradition"`
	Values         []string  `json:"values"`
	Practices      []string  `json:"practices"`
	CommunityStyle string    `json:"community_style"`
	Score          float64   `json:"score"`
}

type MessageRequest struct {
	ID            uuid.UUID  `json:"id"`
	SenderID      uuid.UUID  `json:"sender_id"`
	RecipientID   uuid.UUID  `json:"recipient_id"`
	IntroMessage  string     `json:"intro_message"`
	Status        string     `json:"status"`
	ConversationID *uuid.UUID `json:"conversation_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	SenderName    string     `json:"sender_name,omitempty"`
	RecipientName string     `json:"recipient_name,omitempty"`
}

type Conversation struct {
	ID               uuid.UUID `json:"id"`
	UserAID          uuid.UUID `json:"user_a_id"`
	UserBID          uuid.UUID `json:"user_b_id"`
	CreatedFromID    uuid.UUID `json:"created_from_request_id"`
	CreatedAt        time.Time `json:"created_at"`
	LastMessageAt    time.Time `json:"last_message_at"`
	OtherUserID      uuid.UUID `json:"other_user_id"`
	OtherDisplayName string    `json:"other_display_name"`
}

type Message struct {
	ID             uuid.UUID `json:"id"`
	ConversationID uuid.UUID `json:"conversation_id"`
	SenderID       uuid.UUID `json:"sender_id"`
	Body           string    `json:"body"`
	CreatedAt      time.Time `json:"created_at"`
}

type Report struct {
	ID             uuid.UUID  `json:"id"`
	ReporterID     uuid.UUID  `json:"reporter_id"`
	ReportedUserID uuid.UUID  `json:"reported_user_id"`
	ConversationID *uuid.UUID `json:"conversation_id,omitempty"`
	Reason         string     `json:"reason"`
	Details        string     `json:"details"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *Store) CreateUser(ctx context.Context, email, passwordHash, displayName, gender string) (User, error) {
	const q = `
		INSERT INTO users (email, password_hash, display_name, gender)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, display_name, gender, is_admin, account_status, is_visible, created_at, password_hash
	`

	var user User
	err := s.pool.QueryRow(ctx, q, email, passwordHash, displayName, gender).Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.Gender,
		&user.IsAdmin,
		&user.AccountStatus,
		&user.IsVisible,
		&user.CreatedAt,
		&user.PasswordHash,
	)
	return user, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (User, error) {
	const q = `
		SELECT id, email, display_name, gender, is_admin, account_status, is_visible, created_at, password_hash
		FROM users
		WHERE email = $1
	`
	var user User
	err := s.pool.QueryRow(ctx, q, email).Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.Gender,
		&user.IsAdmin,
		&user.AccountStatus,
		&user.IsVisible,
		&user.CreatedAt,
		&user.PasswordHash,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (s *Store) GetUserByID(ctx context.Context, userID uuid.UUID) (User, error) {
	const q = `
		SELECT id, email, display_name, gender, is_admin, account_status, is_visible, created_at, password_hash
		FROM users
		WHERE id = $1
	`
	var user User
	err := s.pool.QueryRow(ctx, q, userID).Scan(
		&user.ID,
		&user.Email,
		&user.DisplayName,
		&user.Gender,
		&user.IsAdmin,
		&user.AccountStatus,
		&user.IsVisible,
		&user.CreatedAt,
		&user.PasswordHash,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

func (s *Store) UpsertProfile(ctx context.Context, profile Profile) (Profile, error) {
	const q = `
		INSERT INTO profiles (user_id, bio, city, country, language, age, occupation, looking_for)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id) DO UPDATE SET
			bio = EXCLUDED.bio,
			city = EXCLUDED.city,
			country = EXCLUDED.country,
			language = EXCLUDED.language,
			age = EXCLUDED.age,
			occupation = EXCLUDED.occupation,
			looking_for = EXCLUDED.looking_for,
			updated_at = NOW()
		RETURNING user_id, bio, city, country, language, age, occupation, looking_for, created_at, updated_at
	`
	err := s.pool.QueryRow(ctx, q, profile.UserID, profile.Bio, profile.City, profile.Country, profile.Language, profile.Age, profile.Occupation, profile.LookingFor).Scan(
		&profile.UserID,
		&profile.Bio,
		&profile.City,
		&profile.Country,
		&profile.Language,
		&profile.Age,
		&profile.Occupation,
		&profile.LookingFor,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)
	return profile, err
}

func (s *Store) UpsertSpiritualProfile(ctx context.Context, profile SpiritualProfile) (SpiritualProfile, error) {
	const q = `
		INSERT INTO spiritual_profiles (user_id, tradition, values, practices, community_style, lifestyle_choices)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE SET
			tradition = EXCLUDED.tradition,
			values = EXCLUDED.values,
			practices = EXCLUDED.practices,
			community_style = EXCLUDED.community_style,
			lifestyle_choices = EXCLUDED.lifestyle_choices,
			updated_at = NOW()
		RETURNING user_id, tradition, values, practices, community_style, lifestyle_choices, created_at, updated_at
	`
	err := s.pool.QueryRow(ctx, q, profile.UserID, profile.Tradition, profile.Values, profile.Practices, profile.CommunityStyle, profile.LifestyleChoices).Scan(
		&profile.UserID,
		&profile.Tradition,
		&profile.Values,
		&profile.Practices,
		&profile.CommunityStyle,
		&profile.LifestyleChoices,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)
	return profile, err
}

func (s *Store) UpsertDiscoveryPreferences(ctx context.Context, pref DiscoveryPreferences) (DiscoveryPreferences, error) {
	const q = `
		INSERT INTO discovery_preferences (user_id, min_age, max_age, max_distance_km, cities, languages, spiritual_values, community_styles, preferred_tradition)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id) DO UPDATE SET
			min_age = EXCLUDED.min_age,
			max_age = EXCLUDED.max_age,
			max_distance_km = EXCLUDED.max_distance_km,
			cities = EXCLUDED.cities,
			languages = EXCLUDED.languages,
			spiritual_values = EXCLUDED.spiritual_values,
			community_styles = EXCLUDED.community_styles,
			preferred_tradition = EXCLUDED.preferred_tradition,
			updated_at = NOW()
		RETURNING user_id, min_age, max_age, max_distance_km, cities, languages, spiritual_values, community_styles, preferred_tradition, created_at, updated_at
	`
	err := s.pool.QueryRow(ctx, q, pref.UserID, pref.MinAge, pref.MaxAge, pref.MaxDistanceKM, pref.Cities, pref.Languages, pref.SpiritualValues, pref.CommunityStyles, pref.PreferredTraditon).Scan(
		&pref.UserID,
		&pref.MinAge,
		&pref.MaxAge,
		&pref.MaxDistanceKM,
		&pref.Cities,
		&pref.Languages,
		&pref.SpiritualValues,
		&pref.CommunityStyles,
		&pref.PreferredTraditon,
		&pref.CreatedAt,
		&pref.UpdatedAt,
	)
	return pref, err
}

func (s *Store) GetDiscoveryContext(ctx context.Context, userID uuid.UUID) (DiscoveryContext, error) {
	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return DiscoveryContext{}, err
	}

	context := DiscoveryContext{User: user}

	if err := s.pool.QueryRow(ctx, `
		SELECT user_id, bio, city, country, language, age, occupation, looking_for, created_at, updated_at
		FROM profiles WHERE user_id = $1
	`, userID).Scan(
		&context.Profile.UserID,
		&context.Profile.Bio,
		&context.Profile.City,
		&context.Profile.Country,
		&context.Profile.Language,
		&context.Profile.Age,
		&context.Profile.Occupation,
		&context.Profile.LookingFor,
		&context.Profile.CreatedAt,
		&context.Profile.UpdatedAt,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return DiscoveryContext{}, err
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT user_id, tradition, values, practices, community_style, lifestyle_choices, created_at, updated_at
		FROM spiritual_profiles WHERE user_id = $1
	`, userID).Scan(
		&context.SpiritualProfile.UserID,
		&context.SpiritualProfile.Tradition,
		&context.SpiritualProfile.Values,
		&context.SpiritualProfile.Practices,
		&context.SpiritualProfile.CommunityStyle,
		&context.SpiritualProfile.LifestyleChoices,
		&context.SpiritualProfile.CreatedAt,
		&context.SpiritualProfile.UpdatedAt,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return DiscoveryContext{}, err
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT user_id, min_age, max_age, max_distance_km, cities, languages, spiritual_values, community_styles, preferred_tradition, created_at, updated_at
		FROM discovery_preferences WHERE user_id = $1
	`, userID).Scan(
		&context.DiscoverySettings.UserID,
		&context.DiscoverySettings.MinAge,
		&context.DiscoverySettings.MaxAge,
		&context.DiscoverySettings.MaxDistanceKM,
		&context.DiscoverySettings.Cities,
		&context.DiscoverySettings.Languages,
		&context.DiscoverySettings.SpiritualValues,
		&context.DiscoverySettings.CommunityStyles,
		&context.DiscoverySettings.PreferredTraditon,
		&context.DiscoverySettings.CreatedAt,
		&context.DiscoverySettings.UpdatedAt,
	); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return DiscoveryContext{}, err
	}

	return context, nil
}

func (s *Store) ListEligibleCandidates(ctx context.Context, userID uuid.UUID, gender string, pref DiscoveryPreferences, limit int) ([]Candidate, error) {
	if limit <= 0 {
		limit = 20
	}
	if pref.MinAge == 0 {
		pref.MinAge = 18
	}
	if pref.MaxAge == 0 {
		pref.MaxAge = 60
	}

	candidateGender := oppositeGender(gender)
	if candidateGender == "" {
		candidateGender = gender
	}

	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.display_name, u.gender, p.age, p.city, p.country, p.language, p.bio,
		       COALESCE(sp.tradition, ''), COALESCE(sp.values, '{}'), COALESCE(sp.practices, '{}'), COALESCE(sp.community_style, '')
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		LEFT JOIN spiritual_profiles sp ON sp.user_id = u.id
		WHERE u.id <> $1
		  AND u.account_status = 'active'
		  AND u.is_visible = TRUE
		  AND u.gender = $2
		  AND p.age BETWEEN $3 AND $4
		  AND NOT EXISTS (
			  SELECT 1 FROM blocks b
			  WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
			     OR (b.blocker_id = u.id AND b.blocked_id = $1)
		  )
		ORDER BY p.updated_at DESC
		LIMIT $5
	`, userID, candidateGender, pref.MinAge, pref.MaxAge, limit*4)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	candidates := make([]Candidate, 0, limit)
	for rows.Next() {
		var c Candidate
		if err := rows.Scan(
			&c.UserID,
			&c.DisplayName,
			&c.Gender,
			&c.Age,
			&c.City,
			&c.Country,
			&c.Language,
			&c.Bio,
			&c.Tradition,
			&c.Values,
			&c.Practices,
			&c.CommunityStyle,
		); err != nil {
			return nil, err
		}
		candidates = append(candidates, c)
	}

	return candidates, rows.Err()
}

func (s *Store) CreateMessageRequest(ctx context.Context, senderID, recipientID uuid.UUID, introMessage string) (MessageRequest, error) {
	blocked, err := s.isBlocked(ctx, senderID, recipientID)
	if err != nil {
		return MessageRequest{}, err
	}
	if blocked {
		return MessageRequest{}, fmt.Errorf("interaction blocked")
	}

	var recipientEligible bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM users WHERE id = $1 AND account_status = 'active' AND is_visible = TRUE
		)
	`, recipientID).Scan(&recipientEligible); err != nil {
		return MessageRequest{}, err
	}
	if !recipientEligible {
		return MessageRequest{}, fmt.Errorf("recipient unavailable")
	}

	var senderGender, recipientGender string
	if err := s.pool.QueryRow(ctx, `
		SELECT s.gender, r.gender
		FROM users s
		JOIN users r ON r.id = $2
		WHERE s.id = $1
	`, senderID, recipientID).Scan(&senderGender, &recipientGender); err != nil {
		return MessageRequest{}, err
	}
	if senderGender == recipientGender {
		return MessageRequest{}, fmt.Errorf("sender and recipient are not eligible to message")
	}

	const q = `
		INSERT INTO message_requests (sender_id, recipient_id, intro_message, status)
		VALUES ($1, $2, $3, 'pending')
		RETURNING id, sender_id, recipient_id, intro_message, status, conversation_id, created_at, updated_at
	`

	var request MessageRequest
	var conversationID pgtype.UUID
	err = s.pool.QueryRow(ctx, q, senderID, recipientID, introMessage).Scan(
		&request.ID,
		&request.SenderID,
		&request.RecipientID,
		&request.IntroMessage,
		&request.Status,
		&conversationID,
		&request.CreatedAt,
		&request.UpdatedAt,
	)
	request.ConversationID = nullableUUID(conversationID)
	return request, err
}

func (s *Store) ListInboxRequests(ctx context.Context, recipientID uuid.UUID) ([]MessageRequest, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT mr.id, mr.sender_id, mr.recipient_id, mr.intro_message, mr.status, mr.conversation_id, mr.created_at, mr.updated_at, su.display_name
		FROM message_requests mr
		JOIN users su ON su.id = mr.sender_id
		WHERE mr.recipient_id = $1
		ORDER BY mr.created_at DESC
	`, recipientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := []MessageRequest{}
	for rows.Next() {
		var req MessageRequest
		var conversationID pgtype.UUID
		if err := rows.Scan(
			&req.ID,
			&req.SenderID,
			&req.RecipientID,
			&req.IntroMessage,
			&req.Status,
			&conversationID,
			&req.CreatedAt,
			&req.UpdatedAt,
			&req.SenderName,
		); err != nil {
			return nil, err
		}
		req.ConversationID = nullableUUID(conversationID)
		requests = append(requests, req)
	}
	return requests, rows.Err()
}

func (s *Store) RespondToRequest(ctx context.Context, requestID, recipientID uuid.UUID, accept bool) (MessageRequest, *Conversation, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return MessageRequest{}, nil, err
	}
	defer tx.Rollback(ctx)

	var req MessageRequest
	var conversationID pgtype.UUID
	if err := tx.QueryRow(ctx, `
		SELECT id, sender_id, recipient_id, intro_message, status, conversation_id, created_at, updated_at
		FROM message_requests
		WHERE id = $1 AND recipient_id = $2
		FOR UPDATE
	`, requestID, recipientID).Scan(
		&req.ID,
		&req.SenderID,
		&req.RecipientID,
		&req.IntroMessage,
		&req.Status,
		&conversationID,
		&req.CreatedAt,
		&req.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MessageRequest{}, nil, ErrNotFound
		}
		return MessageRequest{}, nil, err
	}
	req.ConversationID = nullableUUID(conversationID)

	if req.Status != "pending" {
		return MessageRequest{}, nil, fmt.Errorf("request already %s", req.Status)
	}

	nextStatus := "rejected"
	if accept {
		nextStatus = "accepted"
	}

	var conversation *Conversation
	if accept {
		conversation = &Conversation{}
		if err := tx.QueryRow(ctx, `
			INSERT INTO conversations (user_a_id, user_b_id, created_from_request_id)
			VALUES ($1, $2, $3)
			RETURNING id, user_a_id, user_b_id, created_from_request_id, created_at, last_message_at
		`, req.SenderID, req.RecipientID, req.ID).Scan(
			&conversation.ID,
			&conversation.UserAID,
			&conversation.UserBID,
			&conversation.CreatedFromID,
			&conversation.CreatedAt,
			&conversation.LastMessageAt,
		); err != nil {
			return MessageRequest{}, nil, err
		}
		req.ConversationID = &conversation.ID
	}

	if _, err := tx.Exec(ctx, `
		UPDATE message_requests
		SET status = $2, conversation_id = $3, updated_at = NOW()
		WHERE id = $1
	`, req.ID, nextStatus, req.ConversationID); err != nil {
		return MessageRequest{}, nil, err
	}

	req.Status = nextStatus
	req.UpdatedAt = time.Now().UTC()

	if err := tx.Commit(ctx); err != nil {
		return MessageRequest{}, nil, err
	}

	return req, conversation, nil
}

func (s *Store) ListConversations(ctx context.Context, userID uuid.UUID) ([]Conversation, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.user_a_id, c.user_b_id, c.created_from_request_id, c.created_at, c.last_message_at,
		       CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END AS other_user_id,
		       ou.display_name
		FROM conversations c
		JOIN users ou ON ou.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END
		WHERE c.user_a_id = $1 OR c.user_b_id = $1
		ORDER BY c.last_message_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []Conversation
	for rows.Next() {
		var conv Conversation
		if err := rows.Scan(
			&conv.ID,
			&conv.UserAID,
			&conv.UserBID,
			&conv.CreatedFromID,
			&conv.CreatedAt,
			&conv.LastMessageAt,
			&conv.OtherUserID,
			&conv.OtherDisplayName,
		); err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}
	return conversations, rows.Err()
}

func (s *Store) ListMessages(ctx context.Context, conversationID, userID uuid.UUID, limit int) ([]Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if err := s.ensureConversationMember(ctx, conversationID, userID); err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, conversation_id, sender_id, body, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Body, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, rows.Err()
}

func (s *Store) CreateMessage(ctx context.Context, conversationID, senderID uuid.UUID, body string) (Message, uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Message{}, uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	var userA, userB uuid.UUID
	if err := tx.QueryRow(ctx, `
		SELECT user_a_id, user_b_id
		FROM conversations
		WHERE id = $1
		FOR UPDATE
	`, conversationID).Scan(&userA, &userB); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Message{}, uuid.Nil, ErrNotFound
		}
		return Message{}, uuid.Nil, err
	}

	if senderID != userA && senderID != userB {
		return Message{}, uuid.Nil, fmt.Errorf("not conversation member")
	}

	recipientID := userA
	if senderID == userA {
		recipientID = userB
	}

	blocked, err := s.isBlocked(ctx, senderID, recipientID)
	if err != nil {
		return Message{}, uuid.Nil, err
	}
	if blocked {
		return Message{}, uuid.Nil, fmt.Errorf("interaction blocked")
	}

	var msg Message
	if err := tx.QueryRow(ctx, `
		INSERT INTO messages (conversation_id, sender_id, body)
		VALUES ($1, $2, $3)
		RETURNING id, conversation_id, sender_id, body, created_at
	`, conversationID, senderID, body).Scan(
		&msg.ID,
		&msg.ConversationID,
		&msg.SenderID,
		&msg.Body,
		&msg.CreatedAt,
	); err != nil {
		return Message{}, uuid.Nil, err
	}

	if _, err := tx.Exec(ctx, `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`, conversationID); err != nil {
		return Message{}, uuid.Nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Message{}, uuid.Nil, err
	}

	return msg, recipientID, nil
}

func (s *Store) CreateBlock(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO blocks (blocker_id, blocked_id)
		VALUES ($1, $2)
		ON CONFLICT (blocker_id, blocked_id) DO NOTHING
	`, blockerID, blockedID)
	return err
}

func (s *Store) CreateReport(ctx context.Context, report Report) (Report, error) {
	var conversationID pgtype.UUID
	err := s.pool.QueryRow(ctx, `
		INSERT INTO reports (reporter_id, reported_user_id, conversation_id, reason, details, status)
		VALUES ($1, $2, $3, $4, $5, 'open')
		RETURNING id, reporter_id, reported_user_id, conversation_id, reason, details, status, created_at
	`, report.ReporterID, report.ReportedUserID, report.ConversationID, report.Reason, report.Details).Scan(
		&report.ID,
		&report.ReporterID,
		&report.ReportedUserID,
		&conversationID,
		&report.Reason,
		&report.Details,
		&report.Status,
		&report.CreatedAt,
	)
	report.ConversationID = nullableUUID(conversationID)
	return report, err
}

func (s *Store) ListReports(ctx context.Context) ([]Report, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, reporter_id, reported_user_id, conversation_id, reason, details, status, created_at
		FROM reports
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []Report
	for rows.Next() {
		var report Report
		var conversationID pgtype.UUID
		if err := rows.Scan(
			&report.ID,
			&report.ReporterID,
			&report.ReportedUserID,
			&conversationID,
			&report.Reason,
			&report.Details,
			&report.Status,
			&report.CreatedAt,
		); err != nil {
			return nil, err
		}
		report.ConversationID = nullableUUID(conversationID)
		reports = append(reports, report)
	}
	return reports, rows.Err()
}

func (s *Store) RecordEvent(ctx context.Context, actorID uuid.UUID, targetUserID *uuid.UUID, conversationID *uuid.UUID, eventType string, payload string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO interaction_events (actor_user_id, target_user_id, conversation_id, event_type, payload)
		VALUES ($1, $2, $3, $4, $5::jsonb)
	`, actorID, targetUserID, conversationID, eventType, payload)
	return err
}

func (s *Store) ensureConversationMember(ctx context.Context, conversationID, userID uuid.UUID) error {
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM conversations
			WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
		)
	`, conversationID, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func (s *Store) isBlocked(ctx context.Context, leftID, rightID uuid.UUID) (bool, error) {
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM blocks
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		)
	`, leftID, rightID).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func oppositeGender(gender string) string {
	switch gender {
	case "male":
		return "female"
	case "female":
		return "male"
	default:
		return ""
	}
}

func nullableUUID(value pgtype.UUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	id := uuid.UUID(value.Bytes)
	return &id
}
