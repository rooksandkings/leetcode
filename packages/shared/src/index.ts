export type Verdict =
  | "queued"
  | "compiling"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "runtime_error"
  | "compilation_error"
  | "output_limit_exceeded"
  | "judge_error";

export type CheckerType = "exact" | "line" | "token" | "float" | "custom";

export type ProblemVisibility = "draft" | "published" | "archived";

export type ProblemSummary = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  acceptedCount: number;
  submissionCount: number;
};

export type ContestSummary = {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  standingsFrozenAt?: string;
  standingsReleasedAt?: string;
  registeredCount: number;
};

export type SubmissionSummary = {
  id: string;
  problemSlug: string;
  problemTitle: string;
  verdict: Verdict;
  language: "python3";
  runtimeMs?: number;
  memoryKb?: number;
  submittedAt: string;
};

export type TestResult = {
  testIndex: number;
  status: Verdict;
  runtimeMs: number;
  memoryKb?: number;
  message: string;
  visibleToUser: boolean;
};

export type StandingRow = {
  rank: number;
  handle: string;
  solved: number;
  penaltyMinutes: number;
  lastAcceptedMinute: number | null;
  problemResults: Record<string, {
    solved: boolean;
    attemptsBeforeSolve: number;
    penaltyMinutes: number;
  }>;
};
