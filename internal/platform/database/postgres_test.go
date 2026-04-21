package database

import (
	"testing"
	"time"
)

func TestBuildConfigSetsPoolDefaults(t *testing.T) {
	cfg, err := buildConfig("postgres://postgres:postgres@localhost:5432/spiritualmeet?sslmode=disable")
	if err != nil {
		t.Fatalf("build config: %v", err)
	}

	if cfg.MaxConns != 20 || cfg.MinConns != 2 {
		t.Fatalf("unexpected pool sizes: max=%d min=%d", cfg.MaxConns, cfg.MinConns)
	}
	if cfg.MaxConnIdleTime != 5*time.Minute || cfg.MaxConnLifetime != 30*time.Minute {
		t.Fatalf("unexpected pool timing: idle=%s lifetime=%s", cfg.MaxConnIdleTime, cfg.MaxConnLifetime)
	}
	if cfg.HealthCheckPeriod != 30*time.Second {
		t.Fatalf("unexpected health check period: %s", cfg.HealthCheckPeriod)
	}
}

func TestBuildConfigRejectsInvalidDSN(t *testing.T) {
	if _, err := buildConfig("://not-a-dsn"); err == nil {
		t.Fatal("expected invalid dsn to fail")
	}
}
