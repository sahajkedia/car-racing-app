package main

import (
	"net/http"
	"testing"
	"time"
)

func TestNewHTTPServer(t *testing.T) {
	handler := http.NewServeMux()
	server := newHTTPServer(":9090", handler)

	if server.Addr != ":9090" {
		t.Fatalf("expected addr :9090, got %q", server.Addr)
	}
	if server.Handler != handler {
		t.Fatal("expected handler to be preserved")
	}
	if server.ReadHeaderTimeout != 5*time.Second {
		t.Fatalf("expected read header timeout to be 5s, got %s", server.ReadHeaderTimeout)
	}
}
