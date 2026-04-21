package auth

import (
	"testing"

	"github.com/google/uuid"
)

func TestIssueAndParseRoundTrip(t *testing.T) {
	manager := NewTokenManager("secret")
	userID := uuid.New()

	token, err := manager.Issue(userID)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	parsed, err := manager.Parse(token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if parsed != userID {
		t.Fatalf("expected %s, got %s", userID, parsed)
	}
}

func TestParseRejectsWrongSecretAndGarbage(t *testing.T) {
	manager := NewTokenManager("secret")
	other := NewTokenManager("other-secret")

	token, err := manager.Issue(uuid.New())
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	if _, err := other.Parse(token); err == nil {
		t.Fatal("expected wrong secret to fail")
	}
	if _, err := manager.Parse("not-a-token"); err == nil {
		t.Fatal("expected garbage token to fail")
	}
}
