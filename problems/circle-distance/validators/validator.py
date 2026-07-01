import sys
from pathlib import Path


def main() -> int:
    path = Path(sys.argv[1])
    data = path.read_text(encoding="utf-8").split()
    if len(data) != 3:
        return 1

    try:
        r, a, b = map(float, data)
    except ValueError:
        return 1

    if not (1.0 <= r <= 1_000_000.0):
        return 1
    if not (0.0 <= a < 360.0 and 0.0 <= b < 360.0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
