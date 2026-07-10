import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { generateVersionLabel } from "@/lib/ai/groq";
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
