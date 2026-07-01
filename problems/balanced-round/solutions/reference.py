import sys


def main() -> None:
    data = list(map(int, sys.stdin.read().split()))
    n, k = data[0], data[1]
    values = sorted(data[2 : 2 + n])

    best = 1
    current = 1
    for index in range(1, n):
        if values[index] - values[index - 1] <= k:
            current += 1
        else:
            current = 1
        best = max(best, current)

    print(n - best)


if __name__ == "__main__":
    main()
