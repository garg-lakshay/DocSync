import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { createVersionSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await getDocumentForUser(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(versions);
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await getDocumentForUser(id, session.user.id, Role.EDITOR);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const snapshot = Buffer.from(parsed.data.ydocSnapshot, "base64");
  if (snapshot.byteLength > 1_048_576) {
    return NextResponse.json({ error: "Snapshot too large" }, { status: 413 });
  }

  let label = parsed.data.label ?? null;
  const plainText = parsed.data.plainText?.trim() ?? "";

  if (!label && process.env.GROQ_API_KEY) {
    label = await generateVersionLabel(plainText);
  }

  if (!label && plainText) {
    label = plainText.split(/\s+/).slice(0, 6).join(" ");
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: id,
      createdById: session.user.id,
      label,
      ydocSnapshot: snapshot,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(version, { status: 201 });
}

async function generateVersionLabel(plainText: string): Promise<string | null> {
  if (!plainText.trim()) {
    console.warn("[version-label] Skipping Groq: empty plainText");
    return null;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Summarize what changed in this document in under 8 words, git-commit-message style. Return only the label, no quotes:\n\n${plainText.slice(0, 2000)}`,
          },
        ],
        max_tokens: 20,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[version-label] Groq error:", response.status, errText);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? null;
    return raw?.replace(/^["']|["']$/g, "") ?? null;
  } catch (error) {
    console.error("[version-label] Groq request failed:", error);
    return null;
  }
}
