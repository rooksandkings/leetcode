import sys


def main() -> None:
    data = list(map(int, sys.stdin.read().split()))
    n = data[0]
    values = data[1 : 1 + n]
    print(sum(abs(value) for value in values))


if __name__ == "__main__":
    main()

