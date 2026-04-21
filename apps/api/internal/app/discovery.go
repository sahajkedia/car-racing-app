package app

import (
	"net/http"
	"sort"
	"strconv"

	"github.com/vjt/spiritualmeet/apps/api/internal/store"
	"github.com/vjt/spiritualmeet/internal/platform/httpx"
)

func (s *Server) handleListCandidates(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.currentUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "missing user")
		return
	}

	context, err := s.store.GetDiscoveryContext(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load discovery context")
		return
	}

	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	candidates, err := s.store.ListEligibleCandidates(r.Context(), userID, context.User.Gender, context.DiscoverySettings, limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not fetch candidates")
		return
	}

	for i := range candidates {
		candidates[i].Score = scoreCandidate(context, candidates[i])
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Score > candidates[j].Score
	})
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	s.logEvent(r.Context(), userID, nil, nil, "discovery.fetched", map[string]any{"count": len(candidates)})
	httpx.JSON(w, http.StatusOK, map[string]any{"candidates": candidates})
}

func scoreCandidate(context store.DiscoveryContext, candidate store.Candidate) float64 {
	score := 0.0

	if context.Profile.City != "" && context.Profile.City == candidate.City {
		score += 3
	}
	if context.Profile.Language != "" && context.Profile.Language == candidate.Language {
		score += 2
	}
	if context.SpiritualProfile.Tradition != "" && context.SpiritualProfile.Tradition == candidate.Tradition {
		score += 2
	}
	if context.SpiritualProfile.CommunityStyle != "" && context.SpiritualProfile.CommunityStyle == candidate.CommunityStyle {
		score += 1
	}

	sharedValues := overlapCount(context.SpiritualProfile.Values, candidate.Values)
	score += float64(sharedValues) * 1.5

	ageMidpoint := float64(context.DiscoverySettings.MinAge+context.DiscoverySettings.MaxAge) / 2
	distance := absFloat(float64(candidate.Age) - ageMidpoint)
	score += maxFloat(0, 2-(distance/10))

	return score
}

func overlapCount(left, right []string) int {
	if len(left) == 0 || len(right) == 0 {
		return 0
	}
	seen := make(map[string]struct{}, len(left))
	for _, item := range left {
		seen[item] = struct{}{}
	}

	count := 0
	for _, item := range right {
		if _, ok := seen[item]; ok {
			count++
		}
	}
	return count
}

func absFloat(value float64) float64 {
	if value < 0 {
		return -value
	}
	return value
}

func maxFloat(left, right float64) float64 {
	if left > right {
		return left
	}
	return right
}
