import sys


CASES = {
    "1": "5 45 225\n",
    "2": "100 15 75\n",
}


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in CASES:
        return 1
    print(CASES[sys.argv[1]], end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
