package config

import (
	"os"
	"strconv"
)

type Config struct {
	AppEnv                   string
	HTTPAddr                 string
	PostgresDSN              string
	RedisAddr                string
	RedisPassword            string
	JWTSecret                string
	AutoMigrate              bool
	MessageRequestsPerMinute int
	MessagesPerMinute        int
	AuthAttemptsPerMinute    int
}

func Load() Config {
	return Config{
		AppEnv:                   getEnv("APP_ENV", "development"),
		HTTPAddr:                 getEnv("HTTP_ADDR", ":8080"),
		PostgresDSN:              getEnv("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/spiritualmeet?sslmode=disable"),
		RedisAddr:                getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:            getEnv("REDIS_PASSWORD", ""),
		JWTSecret:                getEnv("JWT_SECRET", "change-me"),
		AutoMigrate:              getBoolEnv("AUTO_MIGRATE", true),
		MessageRequestsPerMinute: getIntEnv("MESSAGE_REQUESTS_PER_MINUTE", 12),
		MessagesPerMinute:        getIntEnv("MESSAGES_PER_MINUTE", 60),
		AuthAttemptsPerMinute:    getIntEnv("AUTH_ATTEMPTS_PER_MINUTE", 20),
	}
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
