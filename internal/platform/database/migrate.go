package database

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	return runMigrations(ctx, pgPoolAdapter{pool: pool}, dir, os.ReadDir, os.ReadFile)
}

type rowScanner interface {
	Scan(dest ...any) error
}

type migrationPool interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) rowScanner
	Begin(ctx context.Context) (migrationTx, error)
}

type migrationTx interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Rollback(ctx context.Context) error
	Commit(ctx context.Context) error
}

type pgPoolAdapter struct {
	pool *pgxpool.Pool
}

func (a pgPoolAdapter) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error) {
	return a.pool.Exec(ctx, sql, arguments...)
}

func (a pgPoolAdapter) QueryRow(ctx context.Context, sql string, args ...any) rowScanner {
	return a.pool.QueryRow(ctx, sql, args...)
}

func (a pgPoolAdapter) Begin(ctx context.Context) (migrationTx, error) {
	tx, err := a.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	return pgTxAdapter{tx: tx}, nil
}

type pgTxAdapter struct {
	tx pgx.Tx
}

func (a pgTxAdapter) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error) {
	return a.tx.Exec(ctx, sql, arguments...)
}

func (a pgTxAdapter) Rollback(ctx context.Context) error {
	return a.tx.Rollback(ctx)
}

func (a pgTxAdapter) Commit(ctx context.Context) error {
	return a.tx.Commit(ctx)
}

func runMigrations(
	ctx context.Context,
	pool migrationPool,
	dir string,
	readDir func(string) ([]fs.DirEntry, error),
	readFile func(string) ([]byte, error),
) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	files, err := listMigrationFiles(dir, readDir)
	if err != nil {
		return err
	}

	for _, version := range files {
		var alreadyApplied bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&alreadyApplied); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if alreadyApplied {
			continue
		}

		path := filepath.Join(dir, version)
		sqlBytes, err := readFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", version, err)
		}

		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("apply migration %s: %w", version, err)
		}

		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("record migration %s: %w", version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %s: %w", version, err)
		}
	}

	return nil
}

func listMigrationFiles(dir string, readDir func(string) ([]fs.DirEntry, error)) ([]string, error) {
	entries, err := readDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}

	sort.Strings(files)
	return files, nil
}
