import { contestProblems, contests } from "@/lib/mock-data";
import { listLocalContestRegistrations } from "@/lib/local-contest-registrations";
import type { LocalSubmissionRecord } from "@/lib/local-submissions";

export class ContestSubmissionEligibilityError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ContestSubmissionEligibilityError";
  }
}

export function assertLocalContestSubmissionAllowed(contestSlug: string | undefined, problemSlug: string, now = new Date()) {
  if (!contestSlug) {
    return;
  }

  const contest = contests.find((candidate) => candidate.slug === contestSlug);
  if (!contest) {
    throw new ContestSubmissionEligibilityError("Contest is not available", 404);
  }

  if (!contestProblems.some((problem) => problem.slug === problemSlug)) {
    throw new ContestSubmissionEligibilityError("Problem is not in this contest", 400);
  }

  const registration = listLocalContestRegistrations(contestSlug).find((candidate) => candidate.handle === "local");
  if (!registration) {
    throw new ContestSubmissionEligibilityError("Register for the contest before submitting", 403);
  }

  const startsAt = new Date(contest.startsAt);
  const endsAt = new Date(contest.endsAt);
  if (now < startsAt) {
    throw new ContestSubmissionEligibilityError("Contest has not started", 403);
  }
  if (now > endsAt) {
    throw new ContestSubmissionEligibilityError("Contest has ended", 403);
  }
}

export function isLocalContestSubmissionScoreable(submission: LocalSubmissionRecord, contestSlug: string) {
  if (submission.contestSlug !== contestSlug) {
    return false;
  }

  const contest = contests.find((candidate) => candidate.slug === contestSlug);
  if (!contest || !contestProblems.some((problem) => problem.slug === submission.problemSlug)) {
    return false;
  }

  const registration = listLocalContestRegistrations(contestSlug).find((candidate) => candidate.handle === "local");
  if (!registration) {
    return false;
  }

  const submittedAt = new Date(submission.submittedAt).getTime();
  const startsAt = new Date(contest.startsAt).getTime();
  const endsAt = new Date(contest.endsAt).getTime();
  const registeredAt = new Date(registration.registeredAt).getTime();

  return submittedAt >= startsAt && submittedAt <= endsAt && submittedAt >= registeredAt;
}
