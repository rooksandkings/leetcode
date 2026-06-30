import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { findRepoRoot } from "@/lib/local-judge";

const execFileAsync = promisify(execFile);

export type PackageVerificationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  package?: PackageMetadata;
};

export type PackageMetadata = {
  slug: string;
  title: string;
  checker: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCount: number;
  hiddenTestCount: number;
  publicTestCount: number;
  hasCustomChecker: boolean;
  hasValidator: boolean;
  hasGenerator: boolean;
};

export type StoredPackageArtifact = {
  source: string;
  storagePath: string;
  localPath: string;
  checksumSha256: string;
  sizeBytes: number;
  report: PackageVerificationReport;
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

export async function storeVerifiedProblemPackagePath(packagePath: string): Promise<StoredPackageArtifact> {
  const report = await verifyProblemPackagePath(packagePath);
  if (!report.ok) {
    throw new Error(report.errors.join("; ") || "Package verification failed");
  }

  const repoRoot = findRepoRoot();
  const resolved = path.resolve(repoRoot, packagePath);
  ensureInsideRepo(resolved, repoRoot);

  const archivePath = path.join(await mkdtemp(path.join(tmpdir(), "codearena-package-store-")), `${packageSlug(report)}.zip`);
  try {
    await runPackager(resolved, archivePath);
    return await localArtifactFromArchive(packagePath, archivePath, report);
  } finally {
    await rm(path.dirname(archivePath), { force: true, recursive: true });
  }
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

export async function storeVerifiedProblemPackageArchive(file: File): Promise<StoredPackageArtifact> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Problem package upload must be a .zip archive");
  }

  const runDir = await mkdtemp(path.join(tmpdir(), "codearena-package-upload-"));
  const archivePath = path.join(runDir, sanitizeArchiveName(file.name));

  try {
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));
    const report = await runVerifier(["verify-zip", "--archive", archivePath]);
    if (!report.ok) {
      throw new Error(report.errors.join("; ") || "Package verification failed");
    }
    return await localArtifactFromArchive(file.name, archivePath, report);
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

async function runPackager(problemPath: string, archivePath: string) {
  const repoRoot = findRepoRoot();
  const cliPath = path.join(repoRoot, "apps", "judge-worker", "cli.py");
  const pythonBin = process.env.PYTHON_BIN ?? "python";
  await execFileAsync(pythonBin, [cliPath, "pack", "--problem", problemPath, "--out", archivePath], {
    cwd: repoRoot,
    maxBuffer: 2_000_000,
    timeout: 30_000,
  });
}

function normalizeReport(value: unknown): PackageVerificationReport {
  const raw = value as Partial<PackageVerificationReport>;
  return {
    ok: Boolean(raw.ok),
    errors: Array.isArray(raw.errors) ? raw.errors.map(String) : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
    package: normalizePackageMetadata(raw.package),
  };
}

async function localArtifactFromArchive(source: string, archivePath: string, report: PackageVerificationReport): Promise<StoredPackageArtifact> {
  const bytes = await readFile(archivePath);
  const checksumSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const slug = packageSlug(report);
  const storagePath = path.posix.join(slug, `${checksumSha256}.zip`);
  const localPath = path.join(findRepoRoot(), ".local", "problem-packages", slug, `${checksumSha256}.zip`);
  await mkdir(path.dirname(localPath), { recursive: true });
  await copyFile(archivePath, localPath);

  return {
    source,
    storagePath,
    localPath,
    checksumSha256,
    sizeBytes: bytes.byteLength,
    report,
  };
}

function packageSlug(report: PackageVerificationReport) {
  const slug = report.package?.slug;
  if (!slug) {
    throw new Error("Verified package report is missing package slug");
  }
  return slug;
}

function normalizePackageMetadata(value: unknown): PackageMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Partial<PackageMetadata>;
  if (typeof raw.slug !== "string" || !raw.slug) {
    return undefined;
  }

  return {
    slug: raw.slug,
    title: typeof raw.title === "string" ? raw.title : raw.slug,
    checker: typeof raw.checker === "string" ? raw.checker : "exact",
    timeLimitMs: Number(raw.timeLimitMs ?? 0),
    memoryLimitMb: Number(raw.memoryLimitMb ?? 0),
    testCount: Number(raw.testCount ?? 0),
    hiddenTestCount: Number(raw.hiddenTestCount ?? 0),
    publicTestCount: Number(raw.publicTestCount ?? 0),
    hasCustomChecker: Boolean(raw.hasCustomChecker),
    hasValidator: Boolean(raw.hasValidator),
    hasGenerator: Boolean(raw.hasGenerator),
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
