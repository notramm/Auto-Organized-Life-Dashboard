# packages/database/README.md
# Database Setup — Step by Step

## Prerequisites
- Docker running (`npm run docker:up` from root)
- `.env` file filled with `DATABASE_URL`

---

## First Time Setup

```bash
# From repo root
cd packages/database

# Step 1 — Generate Prisma client (TypeScript types)
npx prisma generate

# Step 2 — Run migrations (creates all tables)
npx prisma migrate dev --name init

# Step 3 — Seed with test data
npx ts-node src/seeds/index.ts

# Step 4 — Optional: open visual browser
npx prisma studio
# Opens at http://localhost:5555
```

---

## If DB already exists (reset)

```bash
npx prisma migrate reset --force
# This drops everything, re-runs migrations, then re-seeds
```

---

## Everyday commands

```bash
# After changing schema.prisma — create new migration
npx prisma migrate dev --name describe_your_change

# Check migration status
npx prisma migrate status

# Push schema without migration file (prototyping only)
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

---

## Tables created

| Table              | Purpose                                    |
|--------------------|--------------------------------------------|
| users              | User accounts, plan, storage quota         |
| oauth_accounts     | Google/GitHub OAuth links                  |
| user_sessions      | JTI tracking for token revocation          |
| folders            | Folder tree (materialized path)            |
| files              | File records with versioning               |
| file_tags          | AI + user tags per file                    |
| file_ai_metadata   | Objects, scenes, OCR, embeddings, summary  |
| file_previews      | S3 keys for thumbnails + preview assets    |
| search_logs        | Query history + click tracking             |
| insight_items      | AI-generated reminders, digests, groups    |
| audit_logs         | Immutable action log                       |

---

## Test Accounts (after seed)

| Email             | Password   | Plan |
|-------------------|------------|------|
| ram@aold.dev      | Test@1234  | Pro  |
| priya@aold.dev    | Test@1234  | Free |
| arjun@aold.dev    | Test@1234  | Free |