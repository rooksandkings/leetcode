from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class SupabaseClientError(Exception):
    pass


@dataclass(frozen=True)
class LeasedJob:
    job_id: str
    submission_id: str
    problem_version_id: str
    source_code: str
    package_storage_path: str
    package_checksum: str | None


class SupabaseJudgeClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.service_role_key = service_role_key

    @classmethod
    def from_env(cls) -> "SupabaseJudgeClient":
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not service_role_key:
            raise SupabaseClientError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

        return cls(url=url, service_role_key=service_role_key)

    def lease_job(self, worker_id: str, lease_seconds: int) -> LeasedJob | None:
        payload = self._post_rpc(
            "lease_judge_job",
            {
                "p_worker_id": worker_id,
                "p_lease_seconds": lease_seconds,
            },
        )
        if not payload:
            return None

        item = payload[0]
        package_storage_path = item.get("package_storage_path")
        if not package_storage_path:
            raise SupabaseClientError("Leased job is missing package_storage_path")

        return LeasedJob(
            job_id=item["job_id"],
            submission_id=item["submission_id"],
            problem_version_id=item["problem_version_id"],
            source_code=item["source_code"],
            package_storage_path=package_storage_path,
            package_checksum=item.get("package_checksum"),
        )

    def finalize_submission(
        self,
        *,
        submission_id: str,
        verdict: str,
        runtime_ms: int,
        memory_kb: int | None,
        results: list[dict[str, Any]],
    ) -> None:
        self._post_rpc(
            "finalize_submission",
            {
                "p_submission_id": submission_id,
                "p_verdict": verdict,
                "p_runtime_ms": runtime_ms,
                "p_memory_kb": memory_kb,
                "p_results": results,
            },
        )

    def download_storage_object(self, storage_path: str, destination: Path) -> None:
        if storage_path.startswith("file://"):
            source = Path(urllib.parse.urlparse(storage_path).path)
            destination.write_bytes(source.read_bytes())
            return

        encoded_path = urllib.parse.quote(storage_path, safe="/")
        request = urllib.request.Request(
            f"{self.url}/storage/v1/object/{encoded_path}",
            headers=self._headers(),
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                destination.write_bytes(response.read())
        except urllib.error.HTTPError as exc:
            raise SupabaseClientError(f"Storage download failed: HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise SupabaseClientError(f"Storage download failed: {exc.reason}") from exc

    def _post_rpc(self, function_name: str, payload: dict[str, Any]) -> Any:
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.url}/rest/v1/rpc/{function_name}",
            data=body,
            headers={
                **self._headers(),
                "Content-Type": "application/json",
                "Prefer": "params=single-object",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response_body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise SupabaseClientError(f"RPC {function_name} failed: HTTP {exc.code} {details}") from exc
        except urllib.error.URLError as exc:
            raise SupabaseClientError(f"RPC {function_name} failed: {exc.reason}") from exc

        if not response_body:
            return None
        return json.loads(response_body)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }

