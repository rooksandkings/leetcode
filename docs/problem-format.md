# Problem Package Format

The MVP problem package uses JSON for dependency-free local parsing. A YAML importer can be added later for author ergonomics.

```text
problem.json
statement.md
samples/
  1.in
  1.out
tests/
  001.in
  001.out
  002.in
  002.out
checkers/
  checker.py
solutions/
  reference.py
  wrong/
    edge_case.py
```

## `problem.json`

```json
{
  "slug": "sum-array",
  "title": "Sum Array",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "checker": {
    "type": "token"
  },
  "tests": [
    {
      "name": "sample",
      "input": "samples/1.in",
      "expected": "samples/1.out",
      "hidden": false
    },
    {
      "name": "hidden-001",
      "input": "tests/001.in",
      "expected": "tests/001.out",
      "hidden": true
    }
  ]
}
```

## Built-In Checkers

- `exact`: normalizes one final trailing newline, then compares text.
- `line`: trims trailing whitespace per line and compares line sequence.
- `token`: compares whitespace-separated tokens.
- `float`: compares numeric tokens with absolute and relative tolerance.
- `custom`: executes `checkers/checker.py input expected actual`.

