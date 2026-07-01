import math
import sys


def main() -> None:
    r, a, b = map(float, sys.stdin.read().split())
    diff = abs(a - b) % 360.0
    shortest = min(diff, 360.0 - diff)
    print(r * shortest * math.pi / 180.0)


if __name__ == "__main__":
    main()
