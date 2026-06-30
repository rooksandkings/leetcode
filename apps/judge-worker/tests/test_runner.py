from __future__ import annotations

import tempfile
import textwrap
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from codearena_judge.problem_package import ProblemPackage
from codearena_judge.runner import JudgeRunner


class RunnerTests(unittest.TestCase):
    def test_judges_seed_problem_acceptance(self) -> None:
        package = ProblemPackage.load(Path("problems/sum-array"))
        result = JudgeRunner(package).judge(Path("examples/submissions/sum_array_ac.py"))
        self.assertEqual(result.final_verdict, "accepted")

    def test_redacts_hidden_wrong_answer(self) -> None:
        package = ProblemPackage.load(Path("problems/sum-array"))
        result = JudgeRunner(package).judge(Path("examples/submissions/sum_array_wa.py"))
        hidden_failures = [test for test in result.tests if test.visibility == "hidden" and test.verdict == "wrong_answer"]
        self.assertTrue(hidden_failures)
        self.assertEqual(hidden_failures[0].message, "Wrong answer on hidden test")

    def test_timeout(self) -> None:
        package = ProblemPackage.load(Path("problems/sum-array"))
        with tempfile.TemporaryDirectory() as temp_dir_name:
            submission = Path(temp_dir_name) / "tle.py"
            submission.write_text("while True:\n    pass\n", encoding="utf-8")
            result = JudgeRunner(package).judge(submission)
        self.assertEqual(result.final_verdict, "time_limit_exceeded")

    def test_runtime_error(self) -> None:
        package = ProblemPackage.load(Path("problems/sum-array"))
        with tempfile.TemporaryDirectory() as temp_dir_name:
            submission = Path(temp_dir_name) / "re.py"
            submission.write_text(textwrap.dedent("""
                raise RuntimeError("boom")
            """), encoding="utf-8")
            result = JudgeRunner(package).judge(submission)
        self.assertEqual(result.final_verdict, "runtime_error")


if __name__ == "__main__":
    unittest.main()
