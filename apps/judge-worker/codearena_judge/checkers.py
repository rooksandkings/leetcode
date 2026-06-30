from __future__ import annotations

import math
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CheckerResult:
    accepted: bool
    message: str
    checker_error: bool = False


def run_checker(
    checker_config: dict[str, Any],
    *,
    problem_root: Path,
    test_input: str,
    expected: str,
    actual: str,
    timeout_ms: int = 2000,
) -> CheckerResult:
    checker_type = checker_config.get("type", "exact")

    if checker_type == "exact":
        return exact_checker(expected, actual)
    if checker_type == "line":
        return line_checker(expected, actual)
    if checker_type == "token":
        return token_checker(expected, actual)
    if checker_type == "float":
        abs_tol = float(checker_config.get("absTol", checker_config.get("abs_tol", 1e-6)))
        rel_tol = float(checker_config.get("relTol", checker_config.get("rel_tol", 1e-6)))
        return float_checker(expected, actual, abs_tol=abs_tol, rel_tol=rel_tol)
    if checker_type == "custom":
        checker_path = problem_root / checker_config.get("path", "checkers/checker.py")
        return custom_checker(
            checker_path,
            test_input=test_input,
            expected=expected,
            actual=actual,
            timeout_ms=timeout_ms,
        )

    return CheckerResult(False, f"Unknown checker type: {checker_type}", checker_error=True)


def exact_checker(expected: str, actual: str) -> CheckerResult:
    if _normalize_newlines(expected).rstrip("\n") == _normalize_newlines(actual).rstrip("\n"):
        return CheckerResult(True, "Accepted")
    return CheckerResult(False, "Output differs")


def line_checker(expected: str, actual: str) -> CheckerResult:
    expected_lines = _lines_without_trailing_whitespace(expected)
    actual_lines = _lines_without_trailing_whitespace(actual)
    if expected_lines == actual_lines:
        return CheckerResult(True, "Accepted")
    return CheckerResult(False, "Line output differs")


def token_checker(expected: str, actual: str) -> CheckerResult:
    if expected.split() == actual.split():
        return CheckerResult(True, "Accepted")
    return CheckerResult(False, "Token output differs")


def float_checker(expected: str, actual: str, *, abs_tol: float, rel_tol: float) -> CheckerResult:
    expected_tokens = expected.split()
    actual_tokens = actual.split()

    if len(expected_tokens) != len(actual_tokens):
        return CheckerResult(False, "Wrong number of output tokens")

    for index, (expected_token, actual_token) in enumerate(zip(expected_tokens, actual_tokens), start=1):
        try:
            expected_value = float(expected_token)
            actual_value = float(actual_token)
        except ValueError:
            return CheckerResult(False, f"Token {index} is not numeric")

        if math.isnan(expected_value) or math.isnan(actual_value):
            return CheckerResult(False, f"Token {index} is NaN")

        delta = abs(actual_value - expected_value)
        if delta <= abs_tol or delta <= rel_tol * max(1.0, abs(expected_value)):
            continue

        return CheckerResult(False, f"Token {index} differs beyond tolerance")

    return CheckerResult(True, "Accepted")


def custom_checker(
    checker_path: Path,
    *,
    test_input: str,
    expected: str,
    actual: str,
    timeout_ms: int,
) -> CheckerResult:
    if not checker_path.exists():
        return CheckerResult(False, "Custom checker is missing", checker_error=True)

    with tempfile.TemporaryDirectory(prefix="codearena-checker-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        input_path = temp_dir / "input.txt"
        expected_path = temp_dir / "expected.txt"
        actual_path = temp_dir / "actual.txt"
        input_path.write_text(test_input, encoding="utf-8")
        expected_path.write_text(expected, encoding="utf-8")
        actual_path.write_text(actual, encoding="utf-8")

        try:
            completed = subprocess.run(
                [sys.executable, "-I", str(checker_path), str(input_path), str(expected_path), str(actual_path)],
                cwd=str(checker_path.parent),
                capture_output=True,
                text=True,
                timeout=timeout_ms / 1000,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return CheckerResult(False, "Custom checker timed out", checker_error=True)

    message = _short_message(completed.stderr or completed.stdout)
    if completed.returncode == 0:
        return CheckerResult(True, message or "Accepted")
    if completed.returncode == 1:
        return CheckerResult(False, message or "Wrong answer")
    return CheckerResult(False, message or "Checker error", checker_error=True)


def _normalize_newlines(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def _lines_without_trailing_whitespace(value: str) -> list[str]:
    normalized = _normalize_newlines(value).rstrip("\n")
    if normalized == "":
        return []
    return [line.rstrip(" \t") for line in normalized.split("\n")]


def _short_message(value: str, limit: int = 300) -> str:
    collapsed = " ".join(value.strip().split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 3] + "..."

