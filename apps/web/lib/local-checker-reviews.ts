import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "@/lib/local-judge";

export type CheckerReviewStatus = "not_required" | "approved" | "rejected";

export type CheckerReviewInput = {
  storagePath: string;
  checksumSha256: string;
  packageSlug: string;
  hasCustomChecker: boolean;
  status: CheckerReviewStatus;
  notes: string;
};

export type LocalCheckerReview = CheckerReviewInput & {
  id: string;
  reviewedAt: string;
};

type StoreShape = {
  reviews: LocalCheckerReview[];
};

export function normalizeCheckerReviewInput(input: unknown): CheckerReviewInput {
  const raw = input as Partial<CheckerReviewInput>;
  const storagePath = pathField(raw.storagePath, "Storage path");
  const checksumSha256 = checksumField(raw.checksumSha256);
  const packageSlug = slugField(raw.packageSlug, "Package slug");
  const hasCustomChecker = Boolean(raw.hasCustomChecker);
  const status = reviewStatus(raw.status);
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";

  if (hasCustomChecker && status === "not_required") {
    throw new Error("Custom checker packages require approval or rejection");
  }
  if (!hasCustomChecker && status !== "not_required") {
    throw new Error("Built-in checker packages do not need custom checker approval");
  }
  if (status === "rejected" && !notes) {
    throw new Error("Rejected custom checkers require review notes");
  }

  return {
    storagePath,
    checksumSha256,
    packageSlug,
    hasCustomChecker,
    status,
    notes,
  };
}

export function recordLocalCheckerReview(input: CheckerReviewInput): LocalCheckerReview {
  const store = readStore();
  const review: LocalCheckerReview = {
    id: `checker_review_${Date.now()}`,
    ...input,
    reviewedAt: new Date().toISOString(),
  };
  writeStore({ reviews: [review, ...store.reviews.filter((item) => item.storagePath !== input.storagePath)].slice(0, 100) });
  return review;
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { reviews: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
  };
}

function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "checker-reviews.json");
}

function pathField(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  const normalized = value.trim().replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(`${label} must be a relative artifact path`);
  }
  return normalized;
}

function checksumField(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("Checksum must be a SHA-256 hex digest");
  }
  return value;
}

function slugField(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[a-z0-9-]+$/.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function reviewStatus(value: unknown): CheckerReviewStatus {
  if (value === "not_required" || value === "approved" || value === "rejected") {
    return value;
  }
  throw new Error("Review status must be not_required, approved, or rejected");
}
