import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    problemSlug?: string;
    language?: string;
    sourceCode?: string;
  };

  if (!body.problemSlug || body.language !== "python3" || !body.sourceCode?.trim()) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  return NextResponse.json(
    {
      id: `local_${Date.now()}`,
      status: "queued",
      problemSlug: body.problemSlug,
    },
    { status: 201 },
  );
}

