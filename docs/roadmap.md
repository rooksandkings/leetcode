# Roadmap

## Phase 1: Vertical Slice

- Seed one problem package.
- Run Python submissions locally.
- Return accepted, wrong answer, timeout, runtime error, and judge error.
- Show problem, editor, submission status, and per-test details in the web app.

## Phase 2: Supabase Integration

- Add migrations.
- Create auth-backed profiles.
- Persist problems, contests, submissions, test results, and jobs.
- Add app route for submission creation.
- Add coarse Realtime updates.

## Phase 3: Fly Worker

- Package the judge worker.
- Claim jobs from Supabase.
- Download problem packages.
- Run submissions on Fly with Linux sandbox controls.
- Write final verdicts and redacted test results.

## Phase 4: Competition

- Add contest registration.
- Add ICPC standings.
- Add standings freeze support.
- Add contest-specific problem aliases.

## Phase 5: Admin Problemsetting

- Add problem package upload.
- Validate package structure before publish.
- Add immutable problem versions.
- Add built-in checker selection.
- Add custom checker review.

## Phase 6: AI Assist

- Draft statements.
- Generate edge-case ideas.
- Generate sample tests.
- Draft checkers and validators.
- Require admin approval before publish.

