package app

import (
	"testing"

	"github.com/vjt/spiritualmeet/apps/api/internal/store"
)

func TestScoreCandidateRewardsAlignment(t *testing.T) {
	context := store.DiscoveryContext{
		Profile: store.Profile{City: "Pune", Language: "en"},
		SpiritualProfile: store.SpiritualProfile{
			Tradition:      "vedanta",
			CommunityStyle: "small-group",
			Values:         []string{"service", "discipline"},
		},
		DiscoverySettings: store.DiscoveryPreferences{
			MinAge: 24,
			MaxAge: 30,
		},
	}

	strong := store.Candidate{
		City:           "Pune",
		Language:       "en",
		Tradition:      "vedanta",
		CommunityStyle: "small-group",
		Values:         []string{"service", "discipline"},
		Age:            27,
	}
	weak := store.Candidate{
		City:           "Delhi",
		Language:       "hi",
		Tradition:      "other",
		CommunityStyle: "large",
		Values:         []string{"curiosity"},
		Age:            40,
	}

	if scoreCandidate(context, strong) <= scoreCandidate(context, weak) {
		t.Fatal("expected aligned candidate to score higher")
	}
}

func TestDiscoveryHelpers(t *testing.T) {
	if got := overlapCount([]string{"a", "b", "c"}, []string{"x", "b", "c"}); got != 2 {
		t.Fatalf("expected overlap of 2, got %d", got)
	}
	if got := overlapCount(nil, []string{"x"}); got != 0 {
		t.Fatalf("expected overlap of 0, got %d", got)
	}
	if got := absFloat(-3.5); got != 3.5 {
		t.Fatalf("expected 3.5, got %f", got)
	}
	if got := maxFloat(2, 5); got != 5 {
		t.Fatalf("expected 5, got %f", got)
	}
}
