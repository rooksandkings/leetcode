from __future__ import annotations

import tempfile
import unittest
import zipfile
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from codearena_judge.packager import package_problem


class PackagerTests(unittest.TestCase):
    def test_packages_seed_problem(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir_name:
            output_path = Path(temp_dir_name) / "sum-array.zip"
            report = package_problem(Path("problems/sum-array"), output_path)

            self.assertTrue(output_path.exists())
            self.assertEqual(len(report.checksum_sha256), 64)

            with zipfile.ZipFile(output_path) as archive:
                names = set(archive.namelist())

            self.assertIn("problem.json", names)
            self.assertIn("statement.md", names)
            self.assertIn("tests/001.in", names)
            self.assertIn("solutions/reference.py", names)


if __name__ == "__main__":
    unittest.main()

