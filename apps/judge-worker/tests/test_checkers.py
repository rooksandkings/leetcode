from __future__ import annotations

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from codearena_judge.checkers import exact_checker, float_checker, line_checker, token_checker


class CheckerTests(unittest.TestCase):
    def test_exact_allows_final_newline_difference(self) -> None:
        self.assertTrue(exact_checker("42\n", "42").accepted)

    def test_line_trims_trailing_whitespace(self) -> None:
        self.assertTrue(line_checker("hello\nworld\n", "hello   \nworld\t\n").accepted)

    def test_token_ignores_whitespace(self) -> None:
        self.assertTrue(token_checker("1 2\n3", "1\n2 3\n").accepted)

    def test_float_accepts_relative_tolerance(self) -> None:
        self.assertTrue(float_checker("1000000", "1000000.5", abs_tol=1e-9, rel_tol=1e-6).accepted)

    def test_float_rejects_wrong_token_count(self) -> None:
        self.assertFalse(float_checker("1 2", "1", abs_tol=1e-6, rel_tol=1e-6).accepted)


if __name__ == "__main__":
    unittest.main()
