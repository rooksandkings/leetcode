# CodeArena Judge Worker

The MVP judge is a dependency-free Python package that runs Python submissions against CodeArena problem packages.

## Commands

```powershell
python apps/judge-worker/cli.py verify --problem problems/sum-array
python apps/judge-worker/cli.py judge --problem problems/sum-array --submission examples/submissions/sum_array_ac.py
```

## Production Direction

This local runner is intentionally portable. The Fly.io worker will wrap the same package with:

- Supabase job leasing
- Problem package download
- Linux sandbox controls
- Service-role writes for final verdicts

