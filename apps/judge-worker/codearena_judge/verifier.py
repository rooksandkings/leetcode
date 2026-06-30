from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import subprocess
import sys

from .problem_package import ProblemPackage, ProblemPackageError
from .runner import JudgeRunner


@dataclass(frozen=True)
class VerificationReport:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_json(self) -> dict[str, object]:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "warnings": self.warnings,
        }


def verify_problem(problem_root: Path) -> VerificationReport:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        package = ProblemPackage.load(problem_root)
    except ProblemPackageError as exc:
        return VerificationReport(ok=False, errors=[str(exc)])

    if not any(not test.hidden for test in package.tests):
        warnings.append("Problem has no public/sample tests")

    if package.checker.get("type") == "custom":
        checker_path = package.root / package.checker.get("path", "checkers/checker.py")
        if not checker_path.exists():
            errors.append(f"Custom checker is missing: {checker_path.relative_to(package.root)}")

    errors.extend(_verify_validator(package))
    errors.extend(_verify_generator(package))

    reference_path = package.root / "solutions" / "reference.py"
    if reference_path.exists():
        result = JudgeRunner(package).judge(reference_path)
        if result.final_verdict != "accepted":
            errors.append(f"Reference solution failed with verdict {result.final_verdict}")
    else:
        warnings.append("No solutions/reference.py found")

    return VerificationReport(ok=not errors, errors=errors, warnings=warnings)


def _verify_validator(package: ProblemPackage) -> list[str]:
    if not package.validator:
        return []

    validator_path = package.root / package.validator.get("path", "validators/validator.py")
    if not validator_path.exists():
        return [f"Validator is missing: {validator_path.relative_to(package.root)}"]

    errors: list[str] = []
    for test in package.tests:
        completed = subprocess.run(
            [sys.executable, "-I", str(validator_path), str(test.input_path)],
            cwd=str(validator_path.parent),
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        if completed.returncode != 0:
            details = _short_message(completed.stderr or completed.stdout)
            errors.append(f"Validator rejected {test.name}: {details or 'non-zero exit'}")

    return errors


def _verify_generator(package: ProblemPackage) -> list[str]:
    if not package.generator:
        return []

    generator_path = package.root / package.generator.get("path", "generators/generator.py")
    if not generator_path.exists():
        return [f"Generator is missing: {generator_path.relative_to(package.root)}"]

    cases = package.generator.get("cases", [])
    if not isinstance(cases, list) or not cases:
        return ["Generator must declare at least one reproducible case"]

    errors: list[str] = []
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict):
            errors.append(f"Generator case {index} must be an object")
            continue

        seed = case.get("seed")
        input_rel = case.get("input")
        if seed is None or not isinstance(input_rel, str):
            errors.append(f"Generator case {index} must include seed and input")
            continue

        input_path = (package.root / input_rel).resolve()
        try:
            input_path.relative_to(package.root)
        except ValueError:
            errors.append(f"Generator case {index} input escapes problem package")
            continue

        if not input_path.exists():
            errors.append(f"Generator case {index} input is missing: {input_rel}")
            continue

        completed = subprocess.run(
            [sys.executable, "-I", str(generator_path), str(seed)],
            cwd=str(generator_path.parent),
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )

        if completed.returncode != 0:
            details = _short_message(completed.stderr or completed.stdout)
            errors.append(f"Generator failed for seed {seed}: {details or 'non-zero exit'}")
            continue

        expected = _normalize(input_path.read_text(encoding="utf-8"))
        actual = _normalize(completed.stdout)
        if actual != expected:
            errors.append(f"Generator seed {seed} does not reproduce {input_rel}")

    return errors


def _normalize(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n").rstrip("\n") + "\n"


def _short_message(value: str, limit: int = 240) -> str:
    collapsed = " ".join(value.strip().split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 3] + "..."
