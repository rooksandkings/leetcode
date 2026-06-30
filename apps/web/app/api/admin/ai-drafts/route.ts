import { NextResponse } from "next/server";
import {
  coerceDraft,
  createLocalDraft,
  normalizeDraftRequest,
  problemDraftSchema,
  type ProblemDraft,
} from "@/lib/ai-drafts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let draftRequest;
  try {
    draftRequest = normalizeDraftRequest(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid draft request" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(createLocalDraft(draftRequest));
  }

  try {
    const draft = await createOpenAiDraft(draftRequest.prompt, draftRequest.checker);
    return NextResponse.json(draft);
  } catch (error) {
    const fallback = createLocalDraft(draftRequest);
    return NextResponse.json({
      ...fallback,
      reviewChecklist: [
        `OpenAI draft failed, local fallback used: ${error instanceof Error ? error.message : "unknown error"}`,
        ...fallback.reviewChecklist,
      ],
    });
  }
}

async function createOpenAiDraft(prompt: string, checker: string): Promise<ProblemDraft> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      instructions:
        "Generate an admin-reviewed ICPC-style Python-only competitive programming problem draft. Return only valid structured data. Hidden tests must be described as ideas, not leaked full cases. Include validator and generator sketches that a human must review before publish.",
      input: `Problem idea: ${prompt}\nPreferred checker: ${checker}`,
      max_output_tokens: 6000,
      text: {
        format: {
          type: "json_schema",
          name: "codearena_problem_draft",
          strict: true,
          schema: problemDraftSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details.slice(0, 240)}`);
  }

  const payload = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

  if (!text) {
    throw new Error("OpenAI response did not include output text");
  }

  return coerceDraft(JSON.parse(text), "openai");
}

