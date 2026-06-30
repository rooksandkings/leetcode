import type { Verdict } from "@codearena/shared";

const labels: Record<Verdict, string> = {
  queued: "Queued",
  compiling: "Compiling",
  running: "Running",
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  time_limit_exceeded: "Time Limit",
  memory_limit_exceeded: "Memory Limit",
  runtime_error: "Runtime Error",
  compilation_error: "Compilation Error",
  output_limit_exceeded: "Output Limit",
  judge_error: "Judge Error",
};

export function StatusPill({ verdict }: { verdict: Verdict }) {
  const className =
    verdict === "accepted"
      ? "status accepted"
      : verdict === "queued" || verdict === "compiling" || verdict === "running"
        ? "status pending"
        : "status failed";

  return <span className={className}>{labels[verdict]}</span>;
}

