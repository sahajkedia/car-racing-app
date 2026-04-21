package app

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
	"github.com/vjt/spiritualmeet/internal/platform/queue"
)

type createBlockBody struct {
	BlockedUserID uuid.UUID `json:"blocked_user_id"`
}

type createReportBody struct {
	ReportedUserID uuid.UUID  `json:"reported_user_id"`
	ConversationID *uuid.UUID `json:"conversation_id"`
	Reason         string     `json:"reason"`
	Details        string     `json:"details"`
}

func (s *Server) handleCreateBlock(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req createBlockBody
	if !s.requireBody(w, r, &req) {
		return
	}
	if req.BlockedUserID == uuid.Nil || req.BlockedUserID == userID {
		httpx.Error(w, http.StatusBadRequest, "valid blocked_user_id is required")
		return
	}

	if err := s.store.CreateBlock(r.Context(), userID, req.BlockedUserID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create block")
		return
	}

	s.logEvent(r.Context(), userID, &req.BlockedUserID, nil, "block.created", req)
	httpx.JSON(w, http.StatusCreated, map[string]any{"status": "blocked"})
}

func (s *Server) handleCreateReport(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req createReportBody
	if !s.requireBody(w, r, &req) {
		return
	}
	if req.ReportedUserID == uuid.Nil || req.Reason == "" {
		httpx.Error(w, http.StatusBadRequest, "reported_user_id and reason are required")
		return
	}

	report, err := s.store.CreateReport(r.Context(), store.Report{
		ReporterID:     userID,
		ReportedUserID: req.ReportedUserID,
		ConversationID: req.ConversationID,
		Reason:         req.Reason,
		Details:        req.Details,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create report")
		return
	}

	s.logEvent(r.Context(), userID, &req.ReportedUserID, req.ConversationID, "report.created", req)
	_ = s.queue.Enqueue(r.Context(), queue.TypeModerationReportAdded, queue.ReportAddedPayload{
		ReportID:       report.ID,
		ReporterID:     userID,
		ReportedUserID: req.ReportedUserID,
		Reason:         req.Reason,
	})
	httpx.JSON(w, http.StatusCreated, report)
}

func (s *Server) handleListReports(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}
	user, err := s.store.GetUserByID(r.Context(), userID)
	if err != nil || !user.IsAdmin {
		httpx.Error(w, http.StatusForbidden, "admin access required")
		return
	}

	reports, err := s.store.ListReports(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list reports")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"reports": reports})
}
