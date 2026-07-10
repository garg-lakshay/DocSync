import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await context.params;
  const document = await getDocumentForUser(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...version,
    ydocSnapshot: Buffer.from(version.ydocSnapshot).toString("base64"),
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await context.params;
  const document = await getDocumentForUser(id, session.user.id, Role.EDITOR);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({
    ydocSnapshot: Buffer.from(version.ydocSnapshot).toString("base64"),
  });
}
