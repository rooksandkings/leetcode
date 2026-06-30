from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

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

    reference_path = package.root / "solutions" / "reference.py"
    if reference_path.exists():
        result = JudgeRunner(package).judge(reference_path)
        if result.final_verdict != "accepted":
            errors.append(f"Reference solution failed with verdict {result.final_verdict}")
    else:
        warnings.append("No solutions/reference.py found")

    return VerificationReport(ok=not errors, errors=errors, warnings=warnings)

