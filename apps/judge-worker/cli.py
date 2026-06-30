from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from codearena_judge.problem_package import ProblemPackage, ProblemPackageError
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

    judge_parser = subparsers.add_parser("judge", help="Judge a Python submission")
    judge_parser.add_argument("--problem", required=True, type=Path)
    judge_parser.add_argument("--submission", required=True, type=Path)

    args = parser.parse_args()

    try:
        if args.command == "verify":
            report = verify_problem(args.problem)
            print(json.dumps(report.to_json(), indent=2))
            return 0 if report.ok else 1

        if args.command == "judge":
            package = ProblemPackage.load(args.problem)
            result = JudgeRunner(package).judge(args.submission)
            print(json.dumps(result.to_json(), indent=2, default=_json_default))
            return 0 if result.final_verdict == "accepted" else 1
    except ProblemPackageError as exc:
        print(f"Problem package error: {exc}", file=sys.stderr)
        return 2

    return 2


if __name__ == "__main__":
    raise SystemExit(main())

