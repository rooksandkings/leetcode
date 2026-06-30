from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Verdict = Literal[
    "accepted",
    "wrong_answer",
    "time_limit_exceeded",
    "memory_limit_exceeded",
    "runtime_error",
    "compilation_error",
    "output_limit_exceeded",
    "judge_error",
]


@dataclass(frozen=True)
class TestResult:
    name: str
    visibility: Literal["public", "hidden"]
    verdict: Verdict
    runtime_ms: int
    memory_kb: int | None
    message: str

    def to_json(self) -> dict[str, object]:
        return {
            "name": self.name,
            "visibility": self.visibility,
            "verdict": self.verdict,
            "runtimeMs": self.runtime_ms,
            "memoryKb": self.memory_kb,
            "message": self.message,
        }


@dataclass(frozen=True)
class JudgeResult:
    problem_slug: str
    final_verdict: Verdict
    runtime_ms: int
    memory_kb: int | None
    tests: list[TestResult]

    def to_json(self) -> dict[str, object]:
        return {
            "problemSlug": self.problem_slug,
            "finalVerdict": self.final_verdict,
            "runtimeMs": self.runtime_ms,
            "memoryKb": self.memory_kb,
            "tests": [test.to_json() for test in self.tests],
        }

