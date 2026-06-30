# Roadmap

## Phase 1: Vertical Slice

- [x] Seed one problem package.
- [x] Run Python submissions locally.
- [x] Return accepted, wrong answer, timeout, runtime error, and judge error.
- [x] Show problem, editor, submission status, and per-test details in the web app.

## Phase 2: Supabase Integration

- [x] Add migrations.
- [x] Create auth-backed profiles.
- [x] Persist problems, contests, submissions, test results, and jobs.
- [x] Add app route for submission creation.
- [ ] Add coarse Realtime updates.

## Phase 3: Fly Worker

- [x] Package the judge worker.
- [x] Claim jobs from Supabase.
- [x] Download problem packages.
- [ ] Run submissions on Fly with Linux sandbox controls.
- [x] Write final verdicts and redacted test results.

## Phase 4: Competition

- [x] Add contest registration.
- [x] Add ICPC standings.
- [x] Enforce contest registration, problem membership, and submission windows.
- [x] Lock contest problem statements before start.
- [x] Resolve contest submissions and statements against locked problem versions.
- [x] Snapshot participant handles for historical standings.
- [x] Add standings freeze UI and release behavior.
- [x] Add admin contest creation and problem assignment.

## Phase 5: Admin Problemsetting

- [x] Add problem package upload verification.
- [x] Store verified package artifacts for publish.
- [x] Validate package manifest structure before draft save.
- [x] Add immutable problem versions.
- [x] Add built-in checker selection.
- [ ] Add custom checker review workflow.
- [x] Add validator verification.
- [x] Add deterministic generator verification.

## Phase 6: AI Assist

- [x] Draft statements.
- [x] Generate edge-case ideas.
- [x] Generate sample tests.
- [x] Draft checkers and validators.
- [x] Require admin approval before publish.
