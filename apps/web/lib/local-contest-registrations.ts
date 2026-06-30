import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "@/lib/local-judge";

export type LocalContestRegistration = {
  contestSlug: string;
  handle: string;
  registeredAt: string;
};

type StoreShape = {
  registrations: LocalContestRegistration[];
};

export function registerLocalContest(contestSlug: string, handle = "local") {
  const normalized = normalizeContestSlug(contestSlug);
  const store = readStore();
  const existing = store.registrations.find(
    (registration) => registration.contestSlug === normalized && registration.handle === handle,
  );

  if (existing) {
    return existing;
  }

  const registration = {
    contestSlug: normalized,
    handle,
    registeredAt: new Date().toISOString(),
  };
  writeStore({ registrations: [registration, ...store.registrations] });
  return registration;
}

export function unregisterLocalContest(contestSlug: string, handle = "local") {
  const normalized = normalizeContestSlug(contestSlug);
  const store = readStore();
  const registrations = store.registrations.filter(
    (registration) => registration.contestSlug !== normalized || registration.handle !== handle,
  );
  writeStore({ registrations });
}

export function isLocalContestRegistered(contestSlug: string, handle = "local") {
  const normalized = normalizeContestSlug(contestSlug);
  return readStore().registrations.some(
    (registration) => registration.contestSlug === normalized && registration.handle === handle,
  );
}

export function listLocalContestRegistrations(contestSlug: string): LocalContestRegistration[] {
  const normalized = normalizeContestSlug(contestSlug);
  return readStore().registrations.filter((registration) => registration.contestSlug === normalized);
}

export function countLocalContestRegistrations(contestSlug: string) {
  return listLocalContestRegistrations(contestSlug).length;
}

function normalizeContestSlug(contestSlug: string) {
  if (!/^[a-z0-9-]+$/.test(contestSlug)) {
    throw new Error("Invalid contest slug");
  }
  return contestSlug;
}

function readStore(): StoreShape {
  const storePath = localStorePath();
  if (!existsSync(storePath)) {
    return { registrations: [] };
  }

  const raw = readFileSync(storePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<StoreShape>;
  return {
    registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
  };
}

function writeStore(store: StoreShape) {
  const storePath = localStorePath();
  mkdirSync(path.dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function localStorePath() {
  return path.join(findRepoRoot(), ".local", "contest-registrations.json");
}

