package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Open(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := buildConfig(dsn)
	if err != nil {
		return nil, err
	}

	return pgxpool.NewWithConfig(ctx, cfg)
}

func buildConfig(dsn string) (*pgxpool.Config, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second

	return cfg, nil
}
