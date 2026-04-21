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

func TestHandleMeAndProfileUpdates(t *testing.T) {
	userID := uuid.New()
	server, _, _ := newTestServer(t, mockStore{
		getDiscoveryContextFn: func(_ context.Context, id uuid.UUID) (store.DiscoveryContext, error) {
			if id != userID {
				t.Fatalf("unexpected user id: %s", id)
			}
			return store.DiscoveryContext{User: store.User{ID: id, Email: "test@example.com"}}, nil
		},
		upsertProfileFn: func(_ context.Context, profile store.Profile) (store.Profile, error) {
			return profile, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleMe(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	req = httptest.NewRequest(http.MethodPut, "/v1/me/profile", strings.NewReader(`{"bio":"hello","city":"Pune","country":"IN","language":"en","age":27,"occupation":"Engineer","looking_for":"serious"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder = httptest.NewRecorder()
	server.handleUpsertProfile(recorder, req)
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"bio":"hello"`) {
		t.Fatalf("unexpected profile response: code=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestHandleSpiritualAndDiscoveryPreferenceUpdates(t *testing.T) {
	userID := uuid.New()
	server, _, _ := newTestServer(t, mockStore{
		upsertSpiritualProfileFn: func(_ context.Context, profile store.SpiritualProfile) (store.SpiritualProfile, error) {
			return profile, nil
		},
		upsertDiscoveryPrefsFn: func(_ context.Context, pref store.DiscoveryPreferences) (store.DiscoveryPreferences, error) {
			return pref, nil
		},
	})

	req := httptest.NewRequest(http.MethodPut, "/v1/me/spiritual-profile", strings.NewReader(`{"tradition":"vedanta","values":["service"],"practices":["meditation"],"community_style":"small-group","lifestyle_choices":["vegetarian"]}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder := httptest.NewRecorder()
	server.handleUpsertSpiritualProfile(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	req = httptest.NewRequest(http.MethodPut, "/v1/me/discovery-preferences", strings.NewReader(`{"min_age":24,"max_age":30,"max_distance_km":20,"cities":["Pune"],"languages":["en"],"spiritual_values":["service"],"community_styles":["small-group"],"preferred_tradition":"vedanta"}`))
	req = req.WithContext(apimiddleware.WithUserID(context.Background(), userID))
	recorder = httptest.NewRecorder()
	server.handleUpsertDiscoveryPreferences(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
