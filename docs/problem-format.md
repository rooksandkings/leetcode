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
validators/
  validator.py
generators/
  generator.py
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
  "validator": {
    "path": "validators/validator.py"
  },
  "generator": {
    "path": "generators/generator.py",
    "cases": [
      {
        "seed": 1,
        "input": "tests/001.in"
      }
    ]
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

## Validator Contract

Optional validators run during package verification:

```text
python validators/validator.py input.txt
```

Exit `0` means valid input. Any non-zero exit rejects the package before publish.

## Generator Contract

Optional generators make hidden tests reproducible. Each manifest case declares a seed and the input file it must reproduce:

```text
python generators/generator.py seed
```

The generator output is normalized for line endings and compared with the declared input file.
