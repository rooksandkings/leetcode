import sys
from pathlib import Path


def main() -> int:
    path = Path(sys.argv[1])
    data = path.read_text(encoding="utf-8").split()
    if len(data) < 3:
        return 1

    try:
        values = list(map(int, data))
    except ValueError:
        return 1

    n, k = values[0], values[1]
    skills = values[2:]
    if len(skills) != n:
        return 1
    if not (1 <= n <= 200_000 and 0 <= k <= 1_000_000_000):
        return 1
    if any(skill < 0 or skill > 1_000_000_000 for skill in skills):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
