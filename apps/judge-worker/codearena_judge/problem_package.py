from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class ProblemPackageError(Exception):
    pass


@dataclass(frozen=True)
class TestCase:
    name: str
    input_path: Path
    expected_path: Path
    hidden: bool

    def read_input(self) -> str:
        return self.input_path.read_text(encoding="utf-8")

    def read_expected(self) -> str:
        return self.expected_path.read_text(encoding="utf-8")


@dataclass(frozen=True)
class ProblemPackage:
    root: Path
    slug: str
    title: str
    time_limit_ms: int
    memory_limit_mb: int
    checker: dict[str, Any]
    validator: dict[str, Any] | None
    generator: dict[str, Any] | None
    tests: list[TestCase]
    statement: str

    @classmethod
    def load(cls, root: Path) -> "ProblemPackage":
        root = root.resolve()
        manifest_path = root / "problem.json"
        if not manifest_path.exists():
            raise ProblemPackageError(f"Missing problem.json at {manifest_path}")

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ProblemPackageError(f"Invalid problem.json: {exc}") from exc

        tests: list[TestCase] = []
        for index, raw_test in enumerate(manifest.get("tests", []), start=1):
            input_rel = raw_test.get("input")
            expected_rel = raw_test.get("expected")
            if not input_rel or not expected_rel:
                raise ProblemPackageError(f"Test {index} must include input and expected paths")
            input_path = _resolve_child(root, input_rel)
            expected_path = _resolve_child(root, expected_rel)
            if not input_path.exists():
                raise ProblemPackageError(f"Missing input file: {input_rel}")
            if not expected_path.exists():
                raise ProblemPackageError(f"Missing expected file: {expected_rel}")
            tests.append(
                TestCase(
                    name=str(raw_test.get("name") or Path(input_rel).with_suffix("").as_posix()),
                    input_path=input_path,
                    expected_path=expected_path,
                    hidden=bool(raw_test.get("hidden", True)),
                )
            )

        if not tests:
            raise ProblemPackageError("Problem package must include at least one test")

        statement_path = root / "statement.md"
        statement = statement_path.read_text(encoding="utf-8") if statement_path.exists() else ""

        return cls(
            root=root,
            slug=_required_str(manifest, "slug"),
            title=_required_str(manifest, "title"),
            time_limit_ms=int(manifest.get("timeLimitMs", 2000)),
            memory_limit_mb=int(manifest.get("memoryLimitMb", 256)),
            checker=dict(manifest.get("checker", {"type": "exact"})),
            validator=dict(manifest["validator"]) if isinstance(manifest.get("validator"), dict) else None,
            generator=dict(manifest["generator"]) if isinstance(manifest.get("generator"), dict) else None,
            tests=tests,
            statement=statement,
        )


def _required_str(manifest: dict[str, Any], key: str) -> str:
    value = manifest.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ProblemPackageError(f"problem.json must include a non-empty {key}")
    return value


def _resolve_child(root: Path, raw_path: str) -> Path:
    resolved = (root / raw_path).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ProblemPackageError(f"Path escapes problem package: {raw_path}") from exc
    return resolved
