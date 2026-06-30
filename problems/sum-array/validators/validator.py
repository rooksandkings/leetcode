from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validator.py input.txt", file=sys.stderr)
        return 2

    tokens = Path(sys.argv[1]).read_text(encoding="utf-8").split()
    if not tokens:
        print("missing n", file=sys.stderr)
        return 1

    try:
        values = list(map(int, tokens))
    except ValueError:
        print("all tokens must be integers", file=sys.stderr)
        return 1

    n = values[0]
    array = values[1:]
    if not 1 <= n <= 200_000:
        print("n is out of range", file=sys.stderr)
        return 1
    if len(array) != n:
        print("array length does not match n", file=sys.stderr)
        return 1
    if any(value < -1_000_000_000 or value > 1_000_000_000 for value in array):
        print("array value is out of range", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

