# CodeArena

CodeArena is a public, ICPC-style competitive programming platform focused on Python submissions, admin-authored problems, custom checkers, and a judge architecture that can grow into a real contest system.

The project is intentionally scoped as a serious portfolio build: Codeforces-style standard input/output problems first, LeetCode-style wrappers later.

## Current Scope

- Public problem browsing and contest pages
- Python 3 submissions only
- ICPC standings: solved count, penalty, first accepted time
- Admin-only problem creation
- Final verdict shown by default with collapsible per-test details
- Built-in checkers: exact, line, token, floating point
- Optional custom `checker.py`
- Local judge worker core with timeout, output cap, and hidden-test redaction
- Supabase schema for auth-backed profiles, problems, contests, submissions, and judge jobs
- Seed-backed Next.js app routes for dashboard, problems, submissions, contests, standings, and admin workflows

## Stack

- Web app: Next.js, TypeScript, Tailwind CSS
- Hosting: Vercel for the product UI and lightweight APIs
- Database/Auth/Storage/Realtime: Supabase
- Judge: Fly.io Machines running isolated Python judge workers
- AI: admin-only problem drafting and test ideation, never auto-publish

## Repository Layout

```text
apps/
  web/                 Next.js app
  judge-worker/        Python judge worker and checker core
docs/                  Architecture, judge security, and problem format notes
examples/              Sample submissions for local judge verification
packages/
  shared/              TypeScript domain contracts
problems/              Seed problem packages
supabase/
  migrations/          Database schema
```

## Local Judge Quick Start

Run the seeded problem against a known accepted solution:

```powershell
python apps/judge-worker/cli.py judge --problem problems/sum-array --submission examples/submissions/sum_array_ac.py
```

Build the zipped artifact expected by the Fly worker:

```powershell
python apps/judge-worker/cli.py pack --problem problems/sum-array --out C:\tmp\sum-array.zip
```

Run judge unit tests:

```powershell
python -m unittest discover apps/judge-worker/tests
```

Run the full local verification set:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
python -m unittest discover apps/judge-worker/tests
```

## Web App Quick Start

Install dependencies from the repo root:

```powershell
npm.cmd install
```

Start the web app:

```powershell
npm.cmd run dev
```

The app is under `apps/web` and defaults to `http://localhost:3000`.

Submission behavior:

- Without Supabase env vars, `/api/submissions` runs the local Python judge in development and returns a real final verdict with redacted per-test results.
- With Supabase env vars, `/api/submissions` requires an authenticated Supabase session and calls `submit_solution`.
- `/login` uses Supabase magic links when env vars are configured.
- Local judging is disabled in production unless `LOCAL_JUDGE_ENABLED=true` is explicitly set.

## Supabase

The initial schema lives in `supabase/migrations/0001_initial_schema.sql`.
The seed data lives in `supabase/seed.sql`.

It includes:

- Auth-backed profiles
- Immutable problem versions
- Public/hidden test metadata
- Contest registration and ICPC standings view
- Submission and per-test result tables
- Judge job leasing/finalization RPCs for service-role workers
- RLS policies that keep hidden tests and judge jobs off the client

## MVP Roadmap

1. Ship the local judge vertical slice with exact, line, token, float, and custom checkers.
2. Wire the Next.js submission form to Supabase submissions and judge jobs.
3. Deploy a Fly.io judge worker that claims jobs and writes verdicts.
4. Add contest registration and ICPC standings.
5. Add admin problem-package upload, validation, and immutable versions.
6. Add AI-assisted problem drafting for admins with mandatory human review.

## Product Rules

- Problem versions are immutable after publish.
- Hidden tests are never sent to the browser.
- Custom checkers, validators, generators, and submissions are all treated as untrusted code.
- The UI may show per-test status, runtime, memory, and redacted messages, but not hidden inputs or expected outputs.
- AI can draft content, but only an admin can publish it.

## Dependency Audit Note

`npm audit` currently reports a moderate PostCSS advisory through Next.js' pinned internal `postcss@8.4.31`. The app's direct PostCSS dependency is pinned to the patched `8.5.x` line, and `npm audit fix --force` is intentionally avoided because npm suggests a breaking downgrade path for Next.js.

## Deployment Plan

- Vercel runs the Next.js app.
- Supabase stores users, problem metadata, submissions, judge jobs, and public contest state.
- Supabase Storage stores versioned problem packages and generated artifacts.
- Fly.io runs judge workers with Linux isolation and one active submission per sandbox.

## Judge Worker Deployment

The production worker entrypoint is `apps/judge-worker/worker.py`.

Required environment variables:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional environment variables:

```text
WORKER_ID=
LEASE_SECONDS=120
WORKER_SLEEP_SECONDS=2
```

Fly.io files:

- `apps/judge-worker/Dockerfile`
- `apps/judge-worker/fly.toml.example`

The worker claims jobs through `lease_judge_job`, downloads the versioned problem package from Supabase Storage, runs the Python judge, and finalizes the submission through `finalize_submission`.
