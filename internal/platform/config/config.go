package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv                   string
	HTTPAddr                 string
	PostgresDSN              string
	RedisAddr                string
	RedisPassword            string
	RedisTLS                 bool
	JWTSecret                string
	AutoMigrate              bool
	MessageRequestsPerMinute int
	MessagesPerMinute        int
	AuthAttemptsPerMinute    int
	AllowedOrigins           []string
}

func Load() Config {
	return Config{
		AppEnv:                   getEnv("APP_ENV", "development"),
		HTTPAddr:                 httpAddr(),
		PostgresDSN:              getEnv("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/spiritualmeet?sslmode=disable"),
		RedisAddr:                getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:            getEnv("REDIS_PASSWORD", ""),
		RedisTLS:                 getBoolEnv("REDIS_TLS", false),
		JWTSecret:                getEnv("JWT_SECRET", "change-me"),
		AutoMigrate:              getBoolEnv("AUTO_MIGRATE", true),
		MessageRequestsPerMinute: getIntEnv("MESSAGE_REQUESTS_PER_MINUTE", 12),
		MessagesPerMinute:        getIntEnv("MESSAGES_PER_MINUTE", 60),
		AuthAttemptsPerMinute:    getIntEnv("AUTH_ATTEMPTS_PER_MINUTE", 20),
		AllowedOrigins:           getListEnv("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
	}
}

// httpAddr returns HTTP_ADDR if set; otherwise 0.0.0.0:$PORT when PORT is set (Render, Heroku-style);
// otherwise :8080.
func httpAddr() string {
	if v := os.Getenv("HTTP_ADDR"); v != "" {
		return v
	}
	if p := os.Getenv("PORT"); p != "" {
		return "0.0.0.0:" + p
	}
	return ":8080"
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getIntEnv(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func getBoolEnv(key string, fallback bool) bool {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func getListEnv(key string, fallback []string) []string {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}

	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	if len(out) == 0 {
		return fallback
	}
	return out
}
