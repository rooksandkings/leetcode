import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "@/lib/local-judge";
import type { PackageVerificationReport, StoredPackageArtifact } from "@/lib/package-verification";

export type LocalPackageVerification = {
  id: string;
  source: string;
  report: PackageVerificationReport;
  verifiedAt: string;
};

export type LocalPackageArtifact = StoredPackageArtifact & {
  id: string;
  storedAt: string;
};

type StoreShape = {
  verifications: LocalPackageVerification[];
  artifacts: LocalPackageArtifact[];
};

export function recordLocalPackageVerification(source: string, report: PackageVerificationReport) {
  const store = readStore();
  const verification: LocalPackageVerification = {
    id: `pkg_${Date.now()}`,
    source,
    report,
    verifiedAt: new Date().toISOString(),
  };
  writeStore({
    verifications: [verification, ...store.verifications].slice(0, 100),
    artifacts: store.artifacts,
  });
  return verification;
}

export function recordLocalPackageArtifact(artifact: StoredPackageArtifact) {
  const store = readStore();
  const storedArtifact: LocalPackageArtifact = {
    id: `artifact_${Date.now()}`,
    ...artifact,
    storedAt: new Date().toISOString(),
  };
  writeStore({
    verifications: store.verifications,
    artifacts: [storedArtifact, ...store.artifacts].slice(0, 100),
  });
  return storedArtifact;
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { verifications: [], artifacts: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    verifications: Array.isArray(parsed.verifications) ? parsed.verifications : [],
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
  };
}

function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "package-verifications.json");
}
