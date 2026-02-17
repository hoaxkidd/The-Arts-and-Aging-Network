# Migrating to Vercel Postgres (Neon)

Your project currently uses SQLite. To deploy with Postgres on Vercel:

## 1. Create a Postgres database

1. Go to [Vercel Dashboard](https://vercel.com) → your project
2. Open the **Storage** tab  
3. Click **Create Database** → choose **Neon** (or another Postgres provider)
4. Connect it to your project
5. Vercel will add `POSTGRES_URL` and `POSTGRES_URL_UNPOOLED` to your env vars

## 2. Set environment variables

In Vercel → Project Settings → Environment Variables, ensure you have:

- **`DATABASE_URL`** – Use the pooled URL (e.g. `POSTGRES_URL` from Neon)
- **`DIRECT_URL`** – Use the unpooled URL (e.g. `POSTGRES_URL_UNPOOLED` from Neon) for migrations

From the Neon integration, you can map:
- `DATABASE_URL` = `POSTGRES_URL` (or similar)
- `DIRECT_URL` = `POSTGRES_URL_UNPOOLED` (or the non-pooler URL)

## 3. Update Prisma schema

In `prisma/schema.prisma`, change the datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 4. Create fresh migrations for PostgreSQL

Your existing migrations are SQLite-specific and won't work on Postgres. Use one of these:

### Option A: Fresh migrations (recommended for new deploy)

1. Rename or remove the old migrations folder:
   ```bash
   mv prisma/migrations prisma/migrations_sqlite_backup
   ```

2. Create new migrations:
   ```bash
   npx prisma migrate dev --name init_postgres
   ```

3. This creates a new migration for PostgreSQL.

### Option B: Schema push (no migration history)

```bash
npx prisma db push
```

This applies your schema directly to Postgres without migration files.

## 5. Run migrations on deploy

Add a build script that runs migrations before the build. In `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

Or use a separate step in your CI/CD to run `prisma migrate deploy`.

## 6. Data migration (optional)

If you need to keep existing SQLite data:

1. Export from SQLite (e.g. with `sqlite3` or a tool)
2. Transform and import into Postgres (SQLite and Postgres differ)

For a new project, a fresh start is usually simpler.

## 7. Local development

For local dev with Postgres:

- Use a free Neon dev database, or
- Use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

Then set `DATABASE_URL` and `DIRECT_URL` in `.env.local` to your local Postgres URL.
