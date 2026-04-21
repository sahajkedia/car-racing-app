package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJSONAndError(t *testing.T) {
	recorder := httptest.NewRecorder()
	JSON(recorder, http.StatusCreated, map[string]string{"status": "ok"})

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", recorder.Code)
	}
	if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("expected application/json, got %q", contentType)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("expected json payload, got %s", recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	Error(recorder, http.StatusBadRequest, "bad input")
	if recorder.Code != http.StatusBadRequest || !strings.Contains(recorder.Body.String(), `"error":"bad input"`) {
		t.Fatalf("expected error payload, got code=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestDecodeRejectsUnknownFields(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"sam","extra":true}`))

	var payload struct {
		Name string `json:"name"`
	}
	err := Decode(req, &payload)
	if err == nil {
		t.Fatal("expected decode to reject unknown field")
	}
}
