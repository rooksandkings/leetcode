import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { findRepoRoot } from "@/lib/local-judge";

const execFileAsync = promisify(execFile);

export type PackageVerificationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export async function verifyProblemPackagePath(packagePath: string): Promise<PackageVerificationReport> {
  const repoRoot = findRepoRoot();
  const resolved = path.resolve(repoRoot, packagePath);
  ensureInsideRepo(resolved, repoRoot);

  if (!existsSync(resolved)) {
    throw new Error("Problem package path does not exist");
  }

  return runVerifier(["verify", "--problem", resolved]);
}

export async function verifyProblemPackageArchive(file: File): Promise<PackageVerificationReport> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Problem package upload must be a .zip archive");
  }

  const runDir = await mkdtemp(path.join(tmpdir(), "codearena-package-upload-"));
  const archivePath = path.join(runDir, sanitizeArchiveName(file.name));

  try {
    await mkdir(runDir, { recursive: true });
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));
    return await runVerifier(["verify-zip", "--archive", archivePath]);
  } finally {
    await rm(runDir, { force: true, recursive: true });
  }
}

async function runVerifier(args: string[]): Promise<PackageVerificationReport> {
  const repoRoot = findRepoRoot();
  const cliPath = path.join(repoRoot, "apps", "judge-worker", "cli.py");
  const pythonBin = process.env.PYTHON_BIN ?? "python";

  try {
    const { stdout } = await execFileAsync(pythonBin, [cliPath, ...args], {
      cwd: repoRoot,
      maxBuffer: 2_000_000,
      timeout: 30_000,
    });
    return normalizeReport(JSON.parse(stdout));
  } catch (error) {
    const maybeOutput = error as { stdout?: string; stderr?: string };
    if (maybeOutput.stdout?.trim()) {
      return normalizeReport(JSON.parse(maybeOutput.stdout));
    }

    throw new Error(maybeOutput.stderr?.trim() || "Package verification failed");
  }
}

function normalizeReport(value: unknown): PackageVerificationReport {
  const raw = value as Partial<PackageVerificationReport>;
  return {
    ok: Boolean(raw.ok),
    errors: Array.isArray(raw.errors) ? raw.errors.map(String) : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
  };
}

function ensureInsideRepo(resolved: string, repoRoot: string) {
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Problem package path must stay inside the repository");
  }
}

function sanitizeArchiveName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "package.zip";
}
