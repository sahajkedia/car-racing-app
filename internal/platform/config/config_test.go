package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("PORT", "")
	t.Setenv("POSTGRES_DSN", "")
	t.Setenv("REDIS_ADDR", "")
	t.Setenv("REDIS_PASSWORD", "")
	t.Setenv("REDIS_TLS", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("AUTO_MIGRATE", "")
	t.Setenv("MESSAGE_REQUESTS_PER_MINUTE", "")
	t.Setenv("MESSAGES_PER_MINUTE", "")
	t.Setenv("AUTH_ATTEMPTS_PER_MINUTE", "")

	cfg := Load()

	if cfg.AppEnv != "development" {
		t.Fatalf("expected default app env, got %q", cfg.AppEnv)
	}
	if cfg.HTTPAddr != ":8080" {
		t.Fatalf("expected default http addr, got %q", cfg.HTTPAddr)
	}
	if cfg.PostgresDSN == "" || cfg.RedisAddr != "localhost:6379" || cfg.JWTSecret != "change-me" {
		t.Fatalf("expected default connection settings, got %+v", cfg)
	}
	if !cfg.AutoMigrate || cfg.MessageRequestsPerMinute != 12 || cfg.MessagesPerMinute != 60 || cfg.AuthAttemptsPerMinute != 20 {
		t.Fatalf("expected default limits, got %+v", cfg)
	}
}

func TestLoadOverridesAndInvalids(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("PORT", "")
	t.Setenv("POSTGRES_DSN", "postgres://example")
	t.Setenv("REDIS_ADDR", "redis:6380")
	t.Setenv("REDIS_PASSWORD", "secret")
	t.Setenv("JWT_SECRET", "jwt-secret")
	t.Setenv("AUTO_MIGRATE", "false")
	t.Setenv("MESSAGE_REQUESTS_PER_MINUTE", "21")
	t.Setenv("MESSAGES_PER_MINUTE", "bad-value")
	t.Setenv("AUTH_ATTEMPTS_PER_MINUTE", "99")

	cfg := Load()

	if cfg.AppEnv != "test" || cfg.HTTPAddr != ":9090" || cfg.PostgresDSN != "postgres://example" {
		t.Fatalf("expected env overrides, got %+v", cfg)
	}
	if cfg.RedisAddr != "redis:6380" || cfg.RedisPassword != "secret" || cfg.JWTSecret != "jwt-secret" {
		t.Fatalf("expected redis/jwt overrides, got %+v", cfg)
	}
	if cfg.AutoMigrate {
		t.Fatal("expected auto migrate to be false")
	}
	if cfg.MessageRequestsPerMinute != 21 {
		t.Fatalf("expected override for request limit, got %d", cfg.MessageRequestsPerMinute)
	}
	if cfg.MessagesPerMinute != 60 {
		t.Fatalf("expected invalid int to fall back, got %d", cfg.MessagesPerMinute)
	}
	if cfg.AuthAttemptsPerMinute != 99 {
		t.Fatalf("expected auth attempts override, got %d", cfg.AuthAttemptsPerMinute)
	}
}

func TestHTTPAddrFromPort(t *testing.T) {
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("PORT", "10000")

	cfg := Load()

	if cfg.HTTPAddr != "0.0.0.0:10000" {
		t.Fatalf("expected addr from PORT, got %q", cfg.HTTPAddr)
	}
}
