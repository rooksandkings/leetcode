from __future__ import annotations

import sys


CASES = {
    "1": [10, 20, 30, 40, 50, 60],
    "2": [-10, 5, -7, 3, 2],
}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: generator.py seed", file=sys.stderr)
        return 2

    values = CASES.get(sys.argv[1])
    if values is None:
        print("unknown seed", file=sys.stderr)
        return 1

    print(len(values))
    print(" ".join(map(str, values)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

