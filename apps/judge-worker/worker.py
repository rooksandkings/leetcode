from __future__ import annotations

import argparse
import os
import shutil
import socket
import sys
import tempfile
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from codearena_judge.problem_package import ProblemPackage
from codearena_judge.runner import JudgeRunner
from supabase_client import LeasedJob, SupabaseClientError, SupabaseJudgeClient


def main() -> int:
    parser = argparse.ArgumentParser(prog="codearena-worker")
    parser.add_argument("--once", action="store_true", help="Claim and process at most one job")
    parser.add_argument("--sleep-seconds", type=float, default=float(os.environ.get("WORKER_SLEEP_SECONDS", "2")))
    parser.add_argument("--lease-seconds", type=int, default=int(os.environ.get("LEASE_SECONDS", "120")))
    parser.add_argument("--worker-id", default=os.environ.get("WORKER_ID") or socket.gethostname())
    args = parser.parse_args()

    client = SupabaseJudgeClient.from_env()

    while True:
      processed = run_once(client, worker_id=args.worker_id, lease_seconds=args.lease_seconds)
      if args.once:
          return 0 if processed else 1
      if not processed:
          time.sleep(args.sleep_seconds)


def run_once(client: SupabaseJudgeClient, *, worker_id: str, lease_seconds: int) -> bool:
    job = client.lease_job(worker_id=worker_id, lease_seconds=lease_seconds)
    if job is None:
        return False

    try:
        result = judge_job(client, job)
        client.finalize_submission(
            submission_id=job.submission_id,
            verdict=result.final_verdict,
            runtime_ms=result.runtime_ms,
            memory_kb=result.memory_kb,
            results=[
                {
                    "testIndex": index,
                    "name": test.name,
                    "visibility": test.visibility,
                    "verdict": test.verdict,
                    "runtimeMs": test.runtime_ms,
                    "memoryKb": test.memory_kb,
                    "messagePublic": test.message,
                    "messageAdmin": test.message,
                }
                for index, test in enumerate(result.tests, start=1)
            ],
        )
    except Exception as exc:  # The worker must mark the job terminal instead of crashing hot.
        client.finalize_submission(
            submission_id=job.submission_id,
            verdict="judge_error",
            runtime_ms=0,
            memory_kb=None,
            results=[
                {
                    "testIndex": 1,
                    "name": "worker",
                    "visibility": "hidden",
                    "verdict": "judge_error",
                    "runtimeMs": 0,
                    "memoryKb": None,
                    "messagePublic": "Judge worker error",
                    "messageAdmin": str(exc),
                }
            ],
        )

    return True


def judge_job(client: SupabaseJudgeClient, job: LeasedJob):
    with tempfile.TemporaryDirectory(prefix="codearena-job-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        archive_path = temp_dir / "problem.zip"
        package_root = temp_dir / "problem"
        submission_path = temp_dir / "submission.py"

        client.download_storage_object(job.package_storage_path, archive_path)
        extract_problem_package(archive_path, package_root)
        submission_path.write_text(job.source_code, encoding="utf-8")

        package = ProblemPackage.load(package_root)
        return JudgeRunner(package).judge(submission_path)


def extract_problem_package(archive_path: Path, destination: Path) -> None:
    if archive_path.is_dir():
        shutil.copytree(archive_path, destination)
        return

    destination.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(archive_path) as archive:
            for member in archive.infolist():
                member_path = (destination / member.filename).resolve()
                try:
                    member_path.relative_to(destination.resolve())
                except ValueError as exc:
                    raise SupabaseClientError(f"Package archive contains unsafe path: {member.filename}") from exc
            archive.extractall(destination)
    except zipfile.BadZipFile as exc:
        raise SupabaseClientError("Problem package is not a valid zip archive") from exc


if __name__ == "__main__":
    raise SystemExit(main())

