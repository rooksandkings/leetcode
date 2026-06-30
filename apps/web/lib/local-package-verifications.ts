import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "@/lib/local-judge";
import type { PackageVerificationReport } from "@/lib/package-verification";

export type LocalPackageVerification = {
  id: string;
  source: string;
  report: PackageVerificationReport;
  verifiedAt: string;
};

type StoreShape = {
  verifications: LocalPackageVerification[];
};

export function recordLocalPackageVerification(source: string, report: PackageVerificationReport) {
  const store = readStore();
  const verification: LocalPackageVerification = {
    id: `pkg_${Date.now()}`,
    source,
    report,
    verifiedAt: new Date().toISOString(),
  };
  writeStore({ verifications: [verification, ...store.verifications].slice(0, 100) });
  return verification;
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { verifications: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    verifications: Array.isArray(parsed.verifications) ? parsed.verifications : [],
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
