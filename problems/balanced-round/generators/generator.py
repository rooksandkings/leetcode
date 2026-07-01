import sys


CASES = {
    "1": "6 3\n10 1 4 7 20 23\n",
    "2": "8 5\n1 100 106 111 200 205 210 216\n",
}


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in CASES:
        return 1
    print(CASES[sys.argv[1]], end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
