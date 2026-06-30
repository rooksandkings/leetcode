from __future__ import annotations

import shutil
import signal
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .checkers import run_checker
from .problem_package import ProblemPackage, TestCase
from .result import JudgeResult, TestResult, Verdict
from .sandbox import SandboxLimits, SandboxResult, run_python_file


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

            completed = run_python_file(
                run_path,
                cwd=temp_dir,
                stdin=test_input,
                limits=SandboxLimits(
                    wall_time_ms=self.problem.time_limit_ms,
                    memory_mb=self.problem.memory_limit_mb,
                    output_limit_bytes=self.output_limit_bytes,
                    file_size_limit_bytes=max(self.output_limit_bytes * 2, 2_000_000),
                ),
                writable_paths=[temp_dir],
            )
            runtime_ms = completed.runtime_ms

            if completed.timed_out:
                return self._result(test_case, "time_limit_exceeded", runtime_ms, "Time limit exceeded", completed.memory_kb)

        stdout = completed.stdout
        stderr = completed.stderr
        if completed.sandbox_error:
            message = _public_or_hidden_message(test_case, public="Judge sandbox error", hidden="Judge sandbox error")
            return self._result(test_case, "judge_error", runtime_ms, message, completed.memory_kb)

        if completed.output_limit_exceeded:
            return self._result(test_case, "output_limit_exceeded", runtime_ms, "Output limit exceeded", completed.memory_kb)

        if _memory_limit_exceeded(completed):
            message = _public_or_hidden_message(test_case, public="Memory limit exceeded", hidden="Memory limit exceeded on hidden test")
            return self._result(test_case, "memory_limit_exceeded", runtime_ms, message, completed.memory_kb)

        if completed.returncode != 0:
            message = _public_or_hidden_message(
                test_case,
                public=f"Runtime error: {_excerpt(stderr) or f'exit code {completed.returncode}'}",
                hidden="Runtime error on hidden test",
            )
            return self._result(test_case, "runtime_error", runtime_ms, message, completed.memory_kb)

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
            return self._result(test_case, "judge_error", runtime_ms, message, completed.memory_kb)

        if checker_result.accepted:
            return self._result(test_case, "accepted", runtime_ms, "Accepted", completed.memory_kb)

        message = _public_or_hidden_message(
            test_case,
            public=_wrong_answer_message(checker_result.message, expected, stdout),
            hidden="Wrong answer on hidden test",
        )
        return self._result(test_case, "wrong_answer", runtime_ms, message, completed.memory_kb)

    def _result(self, test_case: TestCase, verdict: Verdict, runtime_ms: int, message: str, memory_kb: int | None = None) -> TestResult:
        return TestResult(
            name=test_case.name,
            visibility="hidden" if test_case.hidden else "public",
            verdict=verdict,
            runtime_ms=runtime_ms,
            memory_kb=memory_kb,
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


def _memory_limit_exceeded(result: SandboxResult) -> bool:
    if "MemoryError" in result.stderr:
        return True
    sigkill = getattr(signal, "SIGKILL", None)
    return sigkill is not None and result.returncode < 0 and -result.returncode == sigkill


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
