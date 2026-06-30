import type { CheckerType } from "@codearena/shared";

export type ProblemDraftRequest = {
  prompt: string;
  checker: CheckerType;
};

export type ProblemDraft = {
  provider: "openai" | "local";
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  checker: CheckerType;
  timeLimitMs: number;
  memoryLimitMb: number;
  statementMarkdown: string;
  samples: Array<{ input: string; output: string }>;
  hiddenTestIdeas: string[];
  referenceSolution: string;
  validatorSketch: string;
  generatorSketch: string;
  packageManifest: string;
  reviewChecklist: string[];
};

export const problemDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "slug",
    "difficulty",
    "checker",
    "timeLimitMs",
    "memoryLimitMb",
    "statementMarkdown",
    "samples",
    "hiddenTestIdeas",
    "referenceSolution",
    "validatorSketch",
    "generatorSketch",
    "packageManifest",
    "reviewChecklist",
  ],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    checker: { type: "string", enum: ["exact", "line", "token", "float", "custom"] },
    timeLimitMs: { type: "integer", minimum: 100, maximum: 30000 },
    memoryLimitMb: { type: "integer", minimum: 16, maximum: 2048 },
    statementMarkdown: { type: "string" },
    samples: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["input", "output"],
        properties: {
          input: { type: "string" },
          output: { type: "string" },
        },
      },
    },
    hiddenTestIdeas: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
    referenceSolution: { type: "string" },
    validatorSketch: { type: "string" },
    generatorSketch: { type: "string" },
    packageManifest: { type: "string" },
    reviewChecklist: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: { type: "string" },
    },
  },
} as const;

export function normalizeDraftRequest(input: unknown): ProblemDraftRequest {
  const raw = input as Partial<ProblemDraftRequest>;
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  const checker = toChecker(raw.checker);

  if (prompt.length < 8) {
    throw new Error("Prompt must describe the problem idea");
  }

  return { prompt: prompt.slice(0, 4000), checker };
}

export function createLocalDraft({ prompt, checker }: ProblemDraftRequest): ProblemDraft {
  const title = titleFromPrompt(prompt);
  const slug = slugify(title);
  const target = prompt.toLowerCase().includes("graph")
    ? "graph nodes"
    : prompt.toLowerCase().includes("string")
      ? "characters"
      : "integers";

  const statementMarkdown = `# ${title}

You are given a sequence of ${target}. Compute the requested value described by the problem setter.

## Input

The first line contains an integer \`n\`.
The second line contains \`n\` values.

## Output

Print one value: the answer for the sequence.

## Constraints

- \`1 <= n <= 200000\`
- Values fit in signed 32-bit integers unless the final statement narrows this further.

## Notes

Draft seed: ${prompt}`;

  return {
    provider: "local",
    title,
    slug,
    difficulty: prompt.length > 140 ? "medium" : "easy",
    checker,
    timeLimitMs: checker === "custom" ? 3000 : 2000,
    memoryLimitMb: 256,
    statementMarkdown,
    samples: [
      {
        input: "5\n1 2 3 4 5\n",
        output: "15\n",
      },
      {
        input: "3\n-2 7 4\n",
        output: "9\n",
      },
    ],
    hiddenTestIdeas: [
      "Minimum n with a single value",
      "All negative values",
      "Large n near the upper bound",
      "Mixed signs with cancellation",
      "Values near integer limits",
    ],
    referenceSolution: `import sys

def main() -> None:
    data = list(map(int, sys.stdin.read().split()))
    n = data[0]
    values = data[1:1+n]
    print(sum(values))

if __name__ == "__main__":
    main()
`,
    validatorSketch: `from pathlib import Path
import sys

tokens = Path(sys.argv[1]).read_text().split()
n = int(tokens[0])
assert 1 <= n <= 200000
assert len(tokens[1:]) == n
`,
    generatorSketch: `import random
import sys

seed = int(sys.argv[1])
random.seed(seed)
n = 10
print(n)
print(" ".join(str(random.randint(-100, 100)) for _ in range(n)))
`,
    packageManifest: JSON.stringify(
      {
        slug,
        title,
        timeLimitMs: checker === "custom" ? 3000 : 2000,
        memoryLimitMb: 256,
        checker: { type: checker },
        validator: { path: "validators/validator.py" },
        generator: {
          path: "generators/generator.py",
          cases: [{ seed: 1, input: "tests/001.in" }],
        },
        tests: [
          { name: "sample-1", input: "samples/1.in", expected: "samples/1.out", hidden: false },
          { name: "hidden-001", input: "tests/001.in", expected: "tests/001.out", hidden: true },
        ],
      },
      null,
      2,
    ),
    reviewChecklist: [
      "Replace the draft objective with the exact intended task",
      "Run the reference solution against all samples and hidden tests",
      "Add at least one known wrong solution and confirm it fails",
      "Run validator over every generated input",
      "Review checker tolerance or custom checker exit-code behavior",
      "Publish only after package verification passes",
    ],
  };
}

export function coerceDraft(value: unknown, provider: ProblemDraft["provider"]): ProblemDraft {
  const raw = value as Partial<ProblemDraft>;
  return {
    provider,
    title: stringOr(raw.title, "Untitled Draft"),
    slug: slugify(stringOr(raw.slug, raw.title ?? "untitled-draft")),
    difficulty: raw.difficulty === "hard" || raw.difficulty === "medium" || raw.difficulty === "easy" ? raw.difficulty : "medium",
    checker: toChecker(raw.checker),
    timeLimitMs: numberOr(raw.timeLimitMs, 2000),
    memoryLimitMb: numberOr(raw.memoryLimitMb, 256),
    statementMarkdown: stringOr(raw.statementMarkdown, ""),
    samples: Array.isArray(raw.samples) ? raw.samples.map(coerceSample).filter((sample): sample is { input: string; output: string } => sample !== null) : [],
    hiddenTestIdeas: stringArray(raw.hiddenTestIdeas),
    referenceSolution: stringOr(raw.referenceSolution, ""),
    validatorSketch: stringOr(raw.validatorSketch, ""),
    generatorSketch: stringOr(raw.generatorSketch, ""),
    packageManifest: stringOr(raw.packageManifest, "{}"),
    reviewChecklist: stringArray(raw.reviewChecklist),
  };
}

function coerceSample(value: unknown) {
  const raw = value as { input?: unknown; output?: unknown };
  if (typeof raw.input !== "string" || typeof raw.output !== "string") {
    return null;
  }
  return { input: raw.input, output: raw.output };
}

function titleFromPrompt(prompt: string) {
  const cleaned = prompt
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");

  return cleaned ? toTitleCase(cleaned) : "Generated Problem";
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "generated-problem";
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toChecker(value: unknown): CheckerType {
  return value === "exact" || value === "line" || value === "token" || value === "float" || value === "custom" ? value : "token";
}
