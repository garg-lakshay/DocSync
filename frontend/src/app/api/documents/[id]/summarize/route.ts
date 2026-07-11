import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateDocumentSummary } from "@/lib/ai/groq";
import { getDocumentForUser } from "@/lib/documents";
import { summarizeSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await getDocumentForUser(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = summarizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const summary = await generateDocumentSummary(parsed.data.plainText);
  if (!summary) {
    return NextResponse.json(
      { error: "Could not generate summary" },
      { status: 502 }
    );
  }

  return NextResponse.json({ summary });
}
