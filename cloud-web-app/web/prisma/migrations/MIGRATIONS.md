# Prisma Migrations — Operator Guide

Round 81 seeds the migrations directory so that every schema change from now on
ships with a versioned SQL migration. This fixes the V5 audit blocker:

> _"Zero pasta migrations. Impossível rollback de migração."_

## Baseline

The repository now includes the initial baseline migration generated from the
current Prisma schema:

- `20260502161641_init/migration.sql`

This gives CI and production a versioned starting point. Future schema changes
must add a new timestamped folder instead of editing this baseline.

1. Ensure `DATABASE_URL` points at a **throwaway** Postgres (never prod).

   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/aethel_dev"
   ```

2. Generate the baseline from the current schema:

   ```bash
   cd cloud-web-app/web
   npx prisma migrate dev --name init --create-only
   ```

   This writes `prisma/migrations/<timestamp>_init/migration.sql` without applying
   it. Review the SQL — it must match the full schema.

3. Apply and commit:

   ```bash
   npx prisma migrate deploy
   git add prisma/migrations
   git commit -m "feat(db): seed initial prisma migration"
   ```

## Subsequent changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate + apply a new migration locally
npx prisma migrate dev --name add_collaborator_permissions
# 3. Commit the migration folder (never edit applied SQL after the fact)
git add prisma/migrations
```

## CI / Production

`scripts/ci-prisma-migrate.sh` is the canonical deployment entry point. It runs
`prisma migrate deploy` against the production/staging `DATABASE_URL` and will
fail-fast on pending migrations or drift.

```bash
# staging / prod
DATABASE_URL=$DATABASE_URL_STAGING ./scripts/ci-prisma-migrate.sh
```

## Golden rules

- ❌ **Never** run `prisma db push` against production — it is destructive.
- ❌ **Never** edit a `migration.sql` file once it has been applied somewhere.
  If you need to correct, create a new migration.
- ❌ **Never** hand-write `migration_lock.toml`. Prisma manages it.
- ✅ Always review the generated SQL diff before committing.
- ✅ For destructive changes (DROP, ALTER type), write a forward migration and
  a tested rollback SQL in the migration folder as `rollback.sql`.
- ✅ Add an entry to `docs/master/DATABASE_CHANGELOG.md` for every migration
  that touches auth, billing, or collaboration tables.

## Why a lock file?

The `migration_lock.toml` records the provider (postgresql) so Prisma can
refuse to apply a migration generated for a different DB engine. Do not delete
it.
