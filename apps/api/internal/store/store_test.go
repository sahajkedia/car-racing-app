package store

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestOppositeGender(t *testing.T) {
	if got := oppositeGender("male"); got != "female" {
		t.Fatalf("expected female, got %q", got)
	}
	if got := oppositeGender("female"); got != "male" {
		t.Fatalf("expected male, got %q", got)
	}
	if got := oppositeGender("other"); got != "" {
		t.Fatalf("expected empty string, got %q", got)
	}
}

func TestNullableUUID(t *testing.T) {
	if got := nullableUUID(pgtype.UUID{}); got != nil {
		t.Fatalf("expected nil for invalid uuid, got %v", got)
	}

	id := uuid.New()
	got := nullableUUID(pgtype.UUID{Bytes: [16]byte(id), Valid: true})
	if got == nil || *got != id {
		t.Fatalf("expected %s, got %v", id, got)
	}
}
