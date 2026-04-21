package database

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestListMigrationFilesSortsAndFilters(t *testing.T) {
	dir := t.TempDir()
	writeTestFile(t, filepath.Join(dir, "002_second.sql"), "SELECT 2;")
	writeTestFile(t, filepath.Join(dir, "001_first.sql"), "SELECT 1;")
	writeTestFile(t, filepath.Join(dir, "README.md"), "ignore")
	if err := os.Mkdir(filepath.Join(dir, "nested"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	files, err := listMigrationFiles(dir, os.ReadDir)
	if err != nil {
		t.Fatalf("list migration files: %v", err)
	}
	if len(files) != 2 || files[0] != "001_first.sql" || files[1] != "002_second.sql" {
		t.Fatalf("unexpected files: %#v", files)
	}
}

func TestRunMigrationsAppliesOnlyPendingFiles(t *testing.T) {
	pool := &fakeMigrationPool{
		applied: map[string]bool{
			"001_first.sql": true,
		},
	}

	readDir := func(string) ([]fs.DirEntry, error) {
		return []fs.DirEntry{
			fakeDirEntry{name: "002_second.sql"},
			fakeDirEntry{name: "001_first.sql"},
		}, nil
	}
	readFile := func(path string) ([]byte, error) {
		return []byte("SELECT 1;"), nil
	}

	if err := runMigrations(context.Background(), pool, "/tmp/migrations", readDir, readFile); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	if len(pool.executedVersions) != 1 || pool.executedVersions[0] != "002_second.sql" {
		t.Fatalf("expected only pending migration to run, got %#v", pool.executedVersions)
	}
	if !pool.createdSchemaTable {
		t.Fatal("expected schema_migrations table bootstrap to run")
	}
}

type fakeMigrationPool struct {
	applied            map[string]bool
	createdSchemaTable bool
	executedVersions   []string
}

func (f *fakeMigrationPool) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	if len(sql) > 0 {
		f.createdSchemaTable = true
	}
	return pgconn.CommandTag{}, nil
}

func (f *fakeMigrationPool) QueryRow(_ context.Context, _ string, args ...any) rowScanner {
	version := args[0].(string)
	return fakeRow{exists: f.applied[version]}
}

func (f *fakeMigrationPool) Begin(_ context.Context) (migrationTx, error) {
	return &fakeMigrationTx{pool: f}, nil
}

type fakeMigrationTx struct {
	pool    *fakeMigrationPool
	version string
}

func (f *fakeMigrationTx) Exec(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	if len(args) == 1 {
		f.version = args[0].(string)
		f.pool.executedVersions = append(f.pool.executedVersions, f.version)
	}
	_ = sql
	return pgconn.CommandTag{}, nil
}

func (f *fakeMigrationTx) Rollback(context.Context) error { return nil }
func (f *fakeMigrationTx) Commit(context.Context) error   { return nil }

type fakeRow struct {
	exists bool
}

func (f fakeRow) Scan(dest ...any) error {
	ptr := dest[0].(*bool)
	*ptr = f.exists
	return nil
}

type fakeDirEntry struct {
	name string
}

func (f fakeDirEntry) Name() string               { return f.name }
func (f fakeDirEntry) IsDir() bool                { return false }
func (f fakeDirEntry) Type() fs.FileMode          { return 0 }
func (f fakeDirEntry) Info() (fs.FileInfo, error) { return nil, nil }

func writeTestFile(t *testing.T, path string, body string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write file %s: %v", path, err)
	}
}
