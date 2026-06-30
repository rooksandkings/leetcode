# Judge Security

The judge treats every submission, checker, validator, and generator as untrusted code.

## MVP Controls

- Run each submission in a fresh temporary directory.
- Use isolated Python mode (`python -I`).
- Enforce per-test wall-clock timeout.
- Cap captured output.
- Kill the whole process group on timeout.
- Apply Linux `rlimit` controls for CPU time, address space, file size, and process count when available.
- Store hidden-test details with redacted user-facing messages.
- Never return hidden inputs, expected outputs, or checker internals to the browser.

## Fly.io Production Controls

The production worker image installs Bubblewrap and sets `CODEARENA_SANDBOX_MODE=bubblewrap`, so submissions, custom checkers, validators, and generators run in a Linux namespace sandbox:

- Disable network access inside the sandbox with `--unshare-net`.
- Run as a non-root user.
- Mount the Python runtime and problem files read-only.
- Give each run a private writable temporary directory.
- Use `rlimit` address-space caps for memory limits.
- Limit processes and file sizes.
- Kill the whole process group on timeout.
- Clear temporary directories after every test.
- Run one active submission per sandbox.

Local development uses `CODEARENA_SANDBOX_MODE=auto` by default: it uses Bubblewrap on Linux when installed, otherwise it falls back to process-level timeout and `rlimit` controls where the host supports them.

## Custom Checker Policy

Custom checkers receive:

```text
checker.py input.txt expected.txt actual.txt
```

Exit codes:

- `0`: accepted
- `1`: wrong answer
- `2`: checker error

Checker stdout/stderr is stored for admins and redacted for regular users.
