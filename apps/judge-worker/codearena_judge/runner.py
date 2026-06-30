from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from .checkers import run_checker
from .problem_package import ProblemPackage, TestCase
from .result import JudgeResult, TestResult, Verdict


@dataclass(frozen=True)
class JudgeRunner:
    problem: ProblemPackage
    output_limit_bytes: int = 1_000_000

    def judge(self, submission_path: Path) -> JudgeResult:
        submission_path = submission_path.resolve()
        if not submission_path.exists():
            raise FileNotFoundError(submission_path)

        test_results = [self._run_test(submission_path, test_case) for test_case in self.problem.tests]
        final_verdict = _final_verdict(test_results)
        total_runtime = sum(result.runtime_ms for result in test_results)
        max_memory = _max_memory(test_results)
        return JudgeResult(
            problem_slug=self.problem.slug,
            final_verdict=final_verdict,
            runtime_ms=total_runtime,
            memory_kb=max_memory,
            tests=test_results,
        )

    def _run_test(self, submission_path: Path, test_case: TestCase) -> TestResult:
        test_input = test_case.read_input()
        expected = test_case.read_expected()

        with tempfile.TemporaryDirectory(prefix="codearena-run-") as temp_dir_name:
            temp_dir = Path(temp_dir_name)
            run_path = temp_dir / "submission.py"
            shutil.copyfile(submission_path, run_path)

            started = time.perf_counter()
            try:
                completed = subprocess.run(
                    [sys.executable, "-I", "-S", str(run_path)],
                    cwd=str(temp_dir),
                    input=test_input,
                    capture_output=True,
                    text=True,
                    timeout=self.problem.time_limit_ms / 1000,
                    check=False,
                )
                runtime_ms = int((time.perf_counter() - started) * 1000)
            except subprocess.TimeoutExpired:
                runtime_ms = int((time.perf_counter() - started) * 1000)
                return self._result(test_case, "time_limit_exceeded", runtime_ms, "Time limit exceeded")

        stdout = completed.stdout
        stderr = completed.stderr
        if len(stdout.encode("utf-8", errors="replace")) > self.output_limit_bytes:
            return self._result(test_case, "output_limit_exceeded", runtime_ms, "Output limit exceeded")

        if completed.returncode != 0:
            message = _public_or_hidden_message(
                test_case,
                public=f"Runtime error: {_excerpt(stderr) or f'exit code {completed.returncode}'}",
                hidden="Runtime error on hidden test",
            )
            return self._result(test_case, "runtime_error", runtime_ms, message)

        checker_result = run_checker(
            self.problem.checker,
            problem_root=self.problem.root,
            test_input=test_input,
            expected=expected,
            actual=stdout,
            timeout_ms=self.problem.time_limit_ms,
        )

        if checker_result.checker_error:
            message = _public_or_hidden_message(test_case, public=checker_result.message, hidden="Checker error")
            return self._result(test_case, "judge_error", runtime_ms, message)

        if checker_result.accepted:
            return self._result(test_case, "accepted", runtime_ms, "Accepted")

        message = _public_or_hidden_message(
            test_case,
            public=_wrong_answer_message(checker_result.message, expected, stdout),
            hidden="Wrong answer on hidden test",
        )
        return self._result(test_case, "wrong_answer", runtime_ms, message)

    def _result(self, test_case: TestCase, verdict: Verdict, runtime_ms: int, message: str) -> TestResult:
        return TestResult(
            name=test_case.name,
            visibility="hidden" if test_case.hidden else "public",
            verdict=verdict,
            runtime_ms=runtime_ms,
            memory_kb=None,
            message=message,
        )


def _final_verdict(results: list[TestResult]) -> Verdict:
    priority: list[Verdict] = [
        "judge_error",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "runtime_error",
        "output_limit_exceeded",
        "wrong_answer",
        "accepted",
    ]
    result_verdicts = {result.verdict for result in results}
    for verdict in priority:
        if verdict in result_verdicts:
            return verdict
    return "judge_error"


def _max_memory(results: list[TestResult]) -> int | None:
    values = [result.memory_kb for result in results if result.memory_kb is not None]
    return max(values) if values else None


def _excerpt(value: str, limit: int = 240) -> str:
    collapsed = " ".join(value.strip().split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 3] + "..."


def _public_or_hidden_message(test_case: TestCase, *, public: str, hidden: str) -> str:
    return hidden if test_case.hidden else public


def _wrong_answer_message(reason: str, expected: str, actual: str) -> str:
    return (
        f"{reason}. "
        f"Expected excerpt: {_excerpt(expected)!r}. "
        f"Actual excerpt: {_excerpt(actual)!r}."
    )

