---
name: prisma-cli-reference
description: >
  Prisma CLI command reference and migration guardrails.
  Use when running prisma init/generate/migrate/db/studio/seed/debug commands.
---

# Prisma CLI Reference

Source:
- https://github.com/prisma/skills
- `prisma-cli/SKILL.md`

## When to use

- Initialize Prisma projects (`prisma init`)
- Generate Prisma Client (`prisma generate`)
- Run development migrations (`prisma migrate dev`)
- Apply production migrations (`prisma migrate deploy`)
- Sync or inspect database state (`prisma db pull/push/seed/execute`)

## Command groups

### Setup
```bash
prisma init
prisma init --datasource-provider postgresql
prisma init --with-model
```

### Client generation
```bash
prisma generate
prisma generate --watch
```

### Database operations
```bash
prisma db pull
prisma db push
prisma db seed
prisma db execute --file ./script.sql
```

### Migrations (development)
```bash
prisma migrate dev
prisma migrate dev --name add_users_table
prisma migrate dev --create-only
prisma migrate reset
```

### Migrations (production)
```bash
prisma migrate deploy
prisma migrate status
prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

### Utility commands
```bash
prisma studio
prisma validate
prisma format
prisma debug
prisma version
```

## Ninewood guardrails

- Prefer `migrate dev` in development to preserve migration history.
- Use `migrate deploy` only in CI/production.
- Reserve `db push` for prototyping or temporary integration cases.
- Run `prisma generate` after schema changes when updated types are required.
- Run `prisma db seed` explicitly when seed data is needed.

## Troubleshooting quick checks

- Connection issues: verify `DATABASE_URL`, network path, and DB permissions.
- Migration conflicts: run `prisma migrate status` before resolving.
- Stale types: run `prisma generate` and restart TypeScript tooling.

## Minimum safety checklist

- Keep migration files in version control.
- Store production DB credentials in secrets, never hard-code.
- Ensure release pipelines always include `prisma migrate deploy`.
