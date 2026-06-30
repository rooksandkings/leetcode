from __future__ import annotations

import argparse
import json
import tempfile
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from codearena_judge.problem_package import ProblemPackage, ProblemPackageError
from codearena_judge.packager import package_problem
from codearena_judge.runner import JudgeRunner
from codearena_judge.verifier import verify_problem


def _json_default(value: object) -> object:
    if hasattr(value, "to_json"):
        return value.to_json()
    raise TypeError(f"{type(value).__name__} is not JSON serializable")


def main() -> int:
    parser = argparse.ArgumentParser(prog="codearena-judge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    verify_parser = subparsers.add_parser("verify", help="Validate a problem package")
    verify_parser.add_argument("--problem", required=True, type=Path)

    verify_zip_parser = subparsers.add_parser("verify-zip", help="Validate a zipped problem package")
    verify_zip_parser.add_argument("--archive", required=True, type=Path)

    judge_parser = subparsers.add_parser("judge", help="Judge a Python submission")
    judge_parser.add_argument("--problem", required=True, type=Path)
    judge_parser.add_argument("--submission", required=True, type=Path)

    pack_parser = subparsers.add_parser("pack", help="Verify and zip a problem package")
    pack_parser.add_argument("--problem", required=True, type=Path)
    pack_parser.add_argument("--out", required=True, type=Path)

    args = parser.parse_args()

    try:
        if args.command == "verify":
            report = verify_problem(args.problem)
            print(json.dumps(report.to_json(), indent=2))
            return 0 if report.ok else 1

        if args.command == "verify-zip":
            report = _verify_zip(args.archive)
            print(json.dumps(report.to_json(), indent=2))
            return 0 if report.ok else 1

        if args.command == "judge":
            package = ProblemPackage.load(args.problem)
            result = JudgeRunner(package).judge(args.submission)
            print(json.dumps(result.to_json(), indent=2, default=_json_default))
            return 0 if result.final_verdict == "accepted" else 1

        if args.command == "pack":
            report = package_problem(args.problem, args.out)
            print(json.dumps(report.to_json(), indent=2))
            return 0
    except ProblemPackageError as exc:
        print(f"Problem package error: {exc}", file=sys.stderr)
        return 2

    return 2


def _verify_zip(archive_path: Path):
    from codearena_judge.verifier import VerificationReport

    archive_path = archive_path.resolve()
    if not archive_path.exists():
        return VerificationReport(ok=False, errors=[f"Archive does not exist: {archive_path}"])

    with tempfile.TemporaryDirectory(prefix="codearena-package-") as raw_tmp:
        extract_root = Path(raw_tmp)
        try:
            with zipfile.ZipFile(archive_path) as archive:
                _safe_extract(archive, extract_root)
        except zipfile.BadZipFile:
            return VerificationReport(ok=False, errors=["Package archive must be a valid zip file"])
        except ValueError as exc:
            return VerificationReport(ok=False, errors=[str(exc)])

        problem_root = _find_problem_root(extract_root)
        if problem_root is None:
            return VerificationReport(ok=False, errors=["Archive must contain a problem.json file"])

        return verify_problem(problem_root)


def _safe_extract(archive: zipfile.ZipFile, destination: Path) -> None:
    destination = destination.resolve()
    for member in archive.infolist():
        member_path = destination / member.filename
        resolved = member_path.resolve()
        try:
            resolved.relative_to(destination)
        except ValueError as exc:
            raise ValueError(f"Archive entry escapes package root: {member.filename}") from exc

        if member.is_dir():
            resolved.mkdir(parents=True, exist_ok=True)
            continue

        resolved.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member) as source, resolved.open("wb") as target:
            target.write(source.read())


def _find_problem_root(extract_root: Path) -> Path | None:
    direct = extract_root / "problem.json"
    if direct.exists():
        return extract_root

    candidates = [path.parent for path in extract_root.glob("*/problem.json") if path.is_file()]
    if len(candidates) == 1:
        return candidates[0]

    return None


if __name__ == "__main__":
    raise SystemExit(main())
