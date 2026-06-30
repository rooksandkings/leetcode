from __future__ import annotations

import hashlib
import zipfile
from dataclasses import dataclass
from pathlib import Path

from .verifier import verify_problem


@dataclass(frozen=True)
class PackageBuildReport:
    output_path: Path
    checksum_sha256: str
    file_count: int

    def to_json(self) -> dict[str, object]:
        return {
            "outputPath": str(self.output_path),
            "checksumSha256": self.checksum_sha256,
            "fileCount": self.file_count,
        }


def package_problem(problem_root: Path, output_path: Path) -> PackageBuildReport:
    problem_root = problem_root.resolve()
    output_path = output_path.resolve()

    report = verify_problem(problem_root)
    if not report.ok:
        raise ValueError("; ".join(report.errors))

    output_path.parent.mkdir(parents=True, exist_ok=True)

    files = [
        path
        for path in sorted(problem_root.rglob("*"))
        if path.is_file() and _should_include(path)
    ]

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(problem_root).as_posix())

    checksum = hashlib.sha256(output_path.read_bytes()).hexdigest()
    return PackageBuildReport(output_path=output_path, checksum_sha256=checksum, file_count=len(files))


def _should_include(path: Path) -> bool:
    ignored_names = {"__pycache__", ".DS_Store"}
    ignored_suffixes = {".pyc", ".pyo"}
    if any(part in ignored_names for part in path.parts):
        return False
    if path.suffix in ignored_suffixes:
        return False
    return True

