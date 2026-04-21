package app

import (
	"net/http"

	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
)

type profileRequest struct {
	Bio        string `json:"bio"`
	City       string `json:"city"`
	Country    string `json:"country"`
	Language   string `json:"language"`
	Age        int    `json:"age"`
	Occupation string `json:"occupation"`
	LookingFor string `json:"looking_for"`
}

type spiritualProfileRequest struct {
	Tradition        string   `json:"tradition"`
	Values           []string `json:"values"`
	Practices        []string `json:"practices"`
	CommunityStyle   string   `json:"community_style"`
	LifestyleChoices []string `json:"lifestyle_choices"`
}

type discoveryPreferencesRequest struct {
	MinAge            int      `json:"min_age"`
	MaxAge            int      `json:"max_age"`
	MaxDistanceKM     int      `json:"max_distance_km"`
	Cities            []string `json:"cities"`
	Languages         []string `json:"languages"`
	SpiritualValues   []string `json:"spiritual_values"`
	CommunityStyles   []string `json:"community_styles"`
	PreferredTraditon string   `json:"preferred_tradition"`
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	me, err := s.store.GetDiscoveryContext(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load account")
		return
	}

	httpx.JSON(w, http.StatusOK, me)
}

func (s *Server) handleUpsertProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req profileRequest
	if !s.requireBody(w, r, &req) {
		return
	}

	profile, err := s.store.UpsertProfile(r.Context(), store.Profile{
		UserID:     userID,
		Bio:        req.Bio,
		City:       req.City,
		Country:    req.Country,
		Language:   req.Language,
		Age:        req.Age,
		Occupation: req.Occupation,
		LookingFor: req.LookingFor,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update profile")
		return
	}

	s.logEvent(r.Context(), userID, nil, nil, "profile.updated", req)
	httpx.JSON(w, http.StatusOK, profile)
}

func (s *Server) handleUpsertSpiritualProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req spiritualProfileRequest
	if !s.requireBody(w, r, &req) {
		return
	}

	profile, err := s.store.UpsertSpiritualProfile(r.Context(), store.SpiritualProfile{
		UserID:           userID,
		Tradition:        req.Tradition,
		Values:           req.Values,
		Practices:        req.Practices,
		CommunityStyle:   req.CommunityStyle,
		LifestyleChoices: req.LifestyleChoices,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update spiritual profile")
		return
	}

	s.logEvent(r.Context(), userID, nil, nil, "spiritual_profile.updated", req)
	httpx.JSON(w, http.StatusOK, profile)
}

func (s *Server) handleUpsertDiscoveryPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	var req discoveryPreferencesRequest
	if !s.requireBody(w, r, &req) {
		return
	}

	prefs, err := s.store.UpsertDiscoveryPreferences(r.Context(), store.DiscoveryPreferences{
		UserID:            userID,
		MinAge:            req.MinAge,
		MaxAge:            req.MaxAge,
		MaxDistanceKM:     req.MaxDistanceKM,
		Cities:            req.Cities,
		Languages:         req.Languages,
		SpiritualValues:   req.SpiritualValues,
		CommunityStyles:   req.CommunityStyles,
		PreferredTraditon: req.PreferredTraditon,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update discovery preferences")
		return
	}

	s.logEvent(r.Context(), userID, nil, nil, "discovery_preferences.updated", req)
	httpx.JSON(w, http.StatusOK, prefs)
}
