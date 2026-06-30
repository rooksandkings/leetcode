import type { ContestSummary, ProblemSummary, SubmissionSummary, TestResult } from "@codearena/shared";

export type ProblemDetail = ProblemSummary & {
  statement: string;
  input: string;
  output: string;
  constraints: string[];
  samples: Array<{ input: string; output: string }>;
  checker: "exact" | "line" | "token" | "float" | "custom";
  timeLimitMs: number;
  memoryLimitMb: number;
};

export const problems: ProblemDetail[] = [
  {
    slug: "sum-array",
    title: "Sum Array",
    difficulty: "easy",
    tags: ["implementation", "prefix basics"],
    acceptedCount: 143,
    submissionCount: 181,
    checker: "token",
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    statement: "Given an array of integers, print the sum of its elements.",
    input: "The first line contains n. The second line contains n integers.",
    output: "Print one integer: the sum of the array.",
    constraints: ["1 <= n <= 200000", "-10^9 <= a_i <= 10^9"],
    samples: [
      {
        input: "5\n1 2 3 4 5",
        output: "15",
      },
    ],
  },
  {
    slug: "balanced-round",
    title: "Balanced Round",
    difficulty: "medium",
    tags: ["sorting", "two pointers"],
    acceptedCount: 78,
    submissionCount: 164,
    checker: "line",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    statement: "Choose the largest group where adjacent sorted skill values differ by at most k.",
    input: "The first line contains n and k. The second line contains n skill values.",
    output: "Print the minimum number of participants to remove.",
    constraints: ["1 <= n <= 200000", "0 <= k <= 10^9"],
    samples: [
      {
        input: "5 2\n1 2 4 8 9",
        output: "2",
      },
    ],
  },
  {
    slug: "circle-distance",
    title: "Circle Distance",
    difficulty: "hard",
    tags: ["geometry", "floating point"],
    acceptedCount: 31,
    submissionCount: 119,
    checker: "float",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    statement: "Compute the shortest distance between two points on a circle arc.",
    input: "The first line contains radius r and two angles in degrees.",
    output: "Print the shortest arc length.",
    constraints: ["1 <= r <= 10^6", "0 <= angle < 360"],
    samples: [
      {
        input: "10 0 90",
        output: "15.7079632679",
      },
    ],
  },
];

export const contests: ContestSummary[] = [
  {
    slug: "summer-sprint-1",
    title: "Summer Sprint 1",
    startsAt: "2026-07-05T18:00:00.000Z",
    endsAt: "2026-07-05T20:00:00.000Z",
    standingsFrozenAt: "2026-07-05T19:30:00.000Z",
    standingsReleasedAt: "2026-07-05T20:05:00.000Z",
    registeredCount: 64,
  },
  {
    slug: "python-open-beta",
    title: "Python Open Beta",
    startsAt: "2026-07-12T17:00:00.000Z",
    endsAt: "2026-07-12T20:00:00.000Z",
    standingsFrozenAt: "2026-07-12T19:30:00.000Z",
    standingsReleasedAt: "2026-07-12T20:05:00.000Z",
    registeredCount: 112,
  },
];

export const submissions: SubmissionSummary[] = [
  {
    id: "sub_1004",
    problemSlug: "sum-array",
    problemTitle: "Sum Array",
    verdict: "accepted",
    language: "python3",
    runtimeMs: 315,
    submittedAt: "2026-06-30T14:12:00.000Z",
  },
  {
    id: "sub_1003",
    problemSlug: "circle-distance",
    problemTitle: "Circle Distance",
    verdict: "wrong_answer",
    language: "python3",
    runtimeMs: 88,
    submittedAt: "2026-06-30T14:05:00.000Z",
  },
  {
    id: "sub_1002",
    problemSlug: "balanced-round",
    problemTitle: "Balanced Round",
    verdict: "time_limit_exceeded",
    language: "python3",
    runtimeMs: 2000,
    submittedAt: "2026-06-30T13:58:00.000Z",
  },
];

export const submissionTests: TestResult[] = [
  {
    testIndex: 1,
    status: "accepted",
    runtimeMs: 105,
    memoryKb: undefined,
    message: "Accepted",
    visibleToUser: true,
  },
  {
    testIndex: 2,
    status: "accepted",
    runtimeMs: 81,
    memoryKb: undefined,
    message: "Accepted",
    visibleToUser: true,
  },
  {
    testIndex: 3,
    status: "accepted",
    runtimeMs: 78,
    memoryKb: undefined,
    message: "Accepted",
    visibleToUser: false,
  },
];

export const contestProblems = [
  { label: "A", slug: "sum-array", title: "Sum Array" },
  { label: "B", slug: "balanced-round", title: "Balanced Round" },
  { label: "C", slug: "circle-distance", title: "Circle Distance" },
];

export const contestEvents = [
  { handle: "rook", problemLabel: "A", verdict: "accepted", minute: 12 },
  { handle: "rook", problemLabel: "B", verdict: "wrong_answer", minute: 28 },
  { handle: "rook", problemLabel: "B", verdict: "accepted", minute: 42 },
  { handle: "king", problemLabel: "A", verdict: "wrong_answer", minute: 8 },
  { handle: "king", problemLabel: "A", verdict: "accepted", minute: 16 },
  { handle: "king", problemLabel: "C", verdict: "wrong_answer", minute: 73 },
  { handle: "bishop", problemLabel: "A", verdict: "accepted", minute: 21 },
  { handle: "bishop", problemLabel: "B", verdict: "accepted", minute: 54 },
] as const;
