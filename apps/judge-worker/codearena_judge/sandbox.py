from __future__ import annotations

import math
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class SandboxLimits:
    wall_time_ms: int
    memory_mb: int
    output_limit_bytes: int = 1_000_000
    file_size_limit_bytes: int = 2_000_000
    process_limit: int = 32


@dataclass(frozen=True)
class SandboxResult:
    returncode: int
    stdout: str
    stderr: str
    runtime_ms: int
    timed_out: bool
    output_limit_exceeded: bool
    memory_kb: int | None
    mode: str

    @property
    def sandbox_error(self) -> bool:
        return self.returncode == 127 and "sandbox is required" in self.stderr


def run_python_file(
    script_path: Path,
    *,
    args: Sequence[str] = (),
    cwd: Path,
    stdin: str = "",
    limits: SandboxLimits,
    read_only_paths: Sequence[Path] = (),
    writable_paths: Sequence[Path] = (),
) -> SandboxResult:
    script_path = script_path.resolve()
    cwd = cwd.resolve()
    command = [sys.executable, "-I", "-S", "-B", str(script_path), *args]
    mode = _sandbox_mode()

    if mode == "bubblewrap":
        bubblewrap_command = _bubblewrap_command(command, cwd, read_only_paths, writable_paths)
        if bubblewrap_command is not None:
            return _run_command(bubblewrap_command, cwd=None, stdin=stdin, limits=limits, mode="bubblewrap")
        return _missing_bubblewrap_result(limits)

    if mode == "auto":
        bubblewrap_command = _bubblewrap_command(command, cwd, read_only_paths, writable_paths)
        if bubblewrap_command is not None:
            return _run_command(bubblewrap_command, cwd=None, stdin=stdin, limits=limits, mode="bubblewrap")

    return _run_command(command, cwd=cwd, stdin=stdin, limits=limits, mode="process")


def _run_command(
    command: Sequence[str],
    *,
    cwd: Path | None,
    stdin: str,
    limits: SandboxLimits,
    mode: str,
) -> SandboxResult:
    started = time.perf_counter()
    stdin_bytes = stdin.encode("utf-8")

    with tempfile.TemporaryDirectory(prefix="codearena-sandbox-io-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        stdout_path = temp_dir / "stdout.txt"
        stderr_path = temp_dir / "stderr.txt"

        with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
            process = subprocess.Popen(
                list(command),
                cwd=str(cwd) if cwd else None,
                stdin=subprocess.PIPE,
                stdout=stdout_file,
                stderr=stderr_file,
                preexec_fn=_preexec(limits) if os.name != "nt" else None,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
            )
            timed_out = False
            try:
                process.communicate(stdin_bytes, timeout=limits.wall_time_ms / 1000)
            except subprocess.TimeoutExpired:
                timed_out = True
                _kill_process_group(process)
                process.communicate()

        runtime_ms = int((time.perf_counter() - started) * 1000)
        stdout_bytes = _read_limited(stdout_path, limits.output_limit_bytes + 1)
        stderr_bytes = _read_limited(stderr_path, min(limits.output_limit_bytes, 64_000))
        output_limit_exceeded = stdout_path.stat().st_size > limits.output_limit_bytes

    return SandboxResult(
        returncode=process.returncode if process.returncode is not None else -1,
        stdout=_decode(stdout_bytes[: limits.output_limit_bytes]),
        stderr=_decode(stderr_bytes),
        runtime_ms=runtime_ms,
        timed_out=timed_out,
        output_limit_exceeded=output_limit_exceeded,
        memory_kb=None,
        mode=mode,
    )


def _bubblewrap_command(
    inner_command: Sequence[str],
    cwd: Path,
    read_only_paths: Sequence[Path],
    writable_paths: Sequence[Path],
) -> list[str] | None:
    if os.name == "nt" or sys.platform != "linux":
        return None

    bwrap = shutil.which("bwrap")
    if not bwrap:
        return None

    command = [
        bwrap,
        "--die-with-parent",
        "--unshare-net",
        "--unshare-pid",
        "--unshare-ipc",
        "--unshare-uts",
        "--new-session",
        "--proc",
        "/proc",
        "--dev",
        "/dev",
        "--tmpfs",
        "/tmp",
        "--clearenv",
        "--setenv",
        "PATH",
        "/usr/local/bin:/usr/bin:/bin",
        "--setenv",
        "PYTHONDONTWRITEBYTECODE",
        "1",
        "--chdir",
        str(cwd),
    ]

    system_paths = _existing_paths(["/usr", "/bin", "/lib", "/lib64"])
    normalized_writable_paths = _unique_paths(writable_paths)
    read_only_mounts = _minimal_mount_paths(
        [path for path in _unique_paths([cwd, *read_only_paths]) if not _is_under_any(path, normalized_writable_paths)]
    )

    for parent in _mount_parent_dirs([*normalized_writable_paths, *read_only_mounts]):
        command.extend(["--dir", str(parent)])

    for system_path in system_paths:
        command.extend(["--ro-bind", str(system_path), str(system_path)])

    for path in normalized_writable_paths:
        command.extend(["--bind", str(path), str(path)])

    for path in read_only_mounts:
        command.extend(["--ro-bind", str(path), str(path)])

    command.extend(["--", *inner_command])
    return command


def _preexec(limits: SandboxLimits):
    def apply_limits() -> None:
        os.setsid()
        try:
            import resource

            cpu_seconds = max(1, math.ceil(limits.wall_time_ms / 1000) + 1)
            memory_bytes = max(64, limits.memory_mb) * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
            resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
            resource.setrlimit(resource.RLIMIT_FSIZE, (limits.file_size_limit_bytes, limits.file_size_limit_bytes))
            if hasattr(resource, "RLIMIT_NPROC"):
                resource.setrlimit(resource.RLIMIT_NPROC, (limits.process_limit, limits.process_limit))
        except (ImportError, OSError, ValueError):
            pass

    return apply_limits


def _kill_process_group(process: subprocess.Popen[bytes]) -> None:
    if os.name == "nt":
        process.kill()
        return

    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def _sandbox_mode() -> str:
    raw_mode = os.environ.get("CODEARENA_SANDBOX_MODE", "auto").strip().lower()
    if raw_mode in {"auto", "bubblewrap", "process"}:
        return raw_mode
    return "auto"


def _missing_bubblewrap_result(limits: SandboxLimits) -> SandboxResult:
    return SandboxResult(
        returncode=127,
        stdout="",
        stderr="bubblewrap sandbox is required but bwrap is not installed",
        runtime_ms=0,
        timed_out=False,
        output_limit_exceeded=False,
        memory_kb=None,
        mode="bubblewrap",
    )


def _existing_paths(paths: Sequence[str]) -> list[Path]:
    return [Path(path) for path in paths if Path(path).exists()]


def _unique_paths(paths: Sequence[Path]) -> list[Path]:
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        resolved = path.resolve()
        key = str(resolved)
        if key not in seen and resolved.exists():
            unique.append(resolved)
            seen.add(key)
    return unique


def _is_under_any(path: Path, parents: Sequence[Path]) -> bool:
    resolved = path.resolve()
    for parent in parents:
        try:
            resolved.relative_to(parent.resolve())
            return True
        except ValueError:
            continue
    return False


def _minimal_mount_paths(paths: Sequence[Path]) -> list[Path]:
    minimal: list[Path] = []
    for path in sorted(paths, key=lambda candidate: len(candidate.parts)):
        if _is_under_any(path, minimal):
            continue
        minimal.append(path)
    return minimal


def _mount_parent_dirs(paths: Sequence[Path]) -> list[Path]:
    parents: list[Path] = []
    seen: set[str] = set()
    for path in sorted(paths, key=lambda candidate: len(candidate.parts)):
        for mount_dir in [*reversed(path.parents), path]:
            if str(mount_dir) in {os.sep, "/tmp"}:
                continue
            key = str(mount_dir)
            if key not in seen:
                parents.append(mount_dir)
                seen.add(key)
    return parents


def _read_limited(path: Path, limit: int) -> bytes:
    with path.open("rb") as handle:
        return handle.read(limit)


def _decode(value: bytes) -> str:
    return value.decode("utf-8", errors="replace")
