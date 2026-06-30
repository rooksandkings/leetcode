# Judge Security

The judge treats every submission, checker, validator, and generator as untrusted code.

## MVP Controls

- Run each submission in a fresh temporary directory.
- Use isolated Python mode (`python -I`).
- Enforce per-test wall-clock timeout.
- Cap captured output.
- Store hidden-test details with redacted user-facing messages.
- Never return hidden inputs, expected outputs, or checker internals to the browser.

## Fly.io Production Controls

The production worker should add Linux-level controls before accepting untrusted public traffic:

- Disable network access inside the sandbox.
- Run as a non-root user.
- Mount problem files read-only.
- Use cgroups for memory limits.
- Limit processes and file sizes.
- Kill the whole process group on timeout.
- Clear temporary directories after every test.
- Run one active submission per sandbox.

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

