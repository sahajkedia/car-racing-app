package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	apimiddleware "github.com/vjt/spiritualmeet/internal/platform/middleware"
)

func TestHandleCreateBlockAndReport(t *testing.T) {
	userID := uuid.New()
	blockedID := uuid.New()
	reportID := uuid.New()
	server, _, queue := newTestServer(t, mockStore{
		createBlockFn: func(_ context.Context, blockerID, gotBlockedID uuid.UUID) error {
			if blockerID != userID || gotBlockedID != blockedID {
				t.Fatalf("unexpected block args")
			}
			return nil
		},
		createReportFn: func(_ context.Context, report store.Report) (store.Report, error) {
			report.ID = reportID
			report.Status = "open"
			return report, nil
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/blocks", strings.NewReader(`{"blocked_user_id":"`+blockedID.String()+`"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleCreateBlock(recorder, req)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/v1/reports", strings.NewReader(`{"reported_user_id":"`+blockedID.String()+`","reason":"spam","details":"too many messages"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder = httptest.NewRecorder()
	server.handleCreateReport(recorder, req)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if len(queue.tasks) != 1 {
		t.Fatalf("expected one moderation task, got %d", len(queue.tasks))
	}
}

func TestHandleListReportsRequiresAdmin(t *testing.T) {
	userID := uuid.New()
	server, _, _ := newTestServer(t, mockStore{
		getUserByIDFn: func(_ context.Context, id uuid.UUID) (store.User, error) {
			return store.User{ID: id, IsAdmin: false}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/admin/reports", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleListReports(recorder, req)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}

	server, _, _ = newTestServer(t, mockStore{
		getUserByIDFn: func(_ context.Context, id uuid.UUID) (store.User, error) {
			return store.User{ID: id, IsAdmin: true}, nil
		},
		listReportsFn: func(context.Context) ([]store.Report, error) {
			return []store.Report{{ID: uuid.New(), ReporterID: userID}}, nil
		},
	})
	req = httptest.NewRequest(http.MethodGet, "/v1/admin/reports", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder = httptest.NewRecorder()
	server.handleListReports(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
