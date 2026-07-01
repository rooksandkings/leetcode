from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from codearena_judge.problem_package import ProblemPackage
from codearena_judge.runner import JudgeRunner
from codearena_judge.verifier import verify_problem


class ProblemPackageTests(unittest.TestCase):
    def test_all_problem_packages_verify(self) -> None:
        for problem_root in sorted(Path("problems").iterdir()):
            if not problem_root.is_dir():
                continue
            with self.subTest(problem=problem_root.name):
                report = verify_problem(problem_root)
                self.assertTrue(report.ok, report.errors)

    def test_all_reference_solutions_are_accepted(self) -> None:
        for problem_root in sorted(Path("problems").iterdir()):
            if not problem_root.is_dir():
                continue
            with self.subTest(problem=problem_root.name):
                package = ProblemPackage.load(problem_root)
                reference = problem_root / "solutions" / "reference.py"
                self.assertTrue(reference.exists())
                result = JudgeRunner(package).judge(reference)
                self.assertEqual(result.final_verdict, "accepted")


if __name__ == "__main__":
    unittest.main()
