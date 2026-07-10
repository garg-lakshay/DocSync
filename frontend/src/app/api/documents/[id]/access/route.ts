import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { shareDocumentSchema } from "@/lib/validations";

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

  const access = await prisma.documentAccess.findMany({
    where: { documentId: id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { role: "desc" },
  });

  return NextResponse.json({
    owner: document.owner,
    members: access.map((row) => ({
      userId: row.user.id,
      email: row.user.email,
      name: row.user.name ?? row.user.email,
      role: row.role,
    })),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await getDocumentForUser(id, session.user.id, Role.OWNER);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = shareDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const access = await prisma.documentAccess.upsert({
    where: {
      documentId_userId: { documentId: id, userId: user.id },
    },
    update: { role: parsed.data.role },
    create: {
      documentId: id,
      userId: user.id,
      role: parsed.data.role,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({
    userId: access.user.id,
    email: access.user.email,
    name: access.user.name ?? access.user.email,
    role: access.role,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await getDocumentForUser(id, session.user.id, Role.OWNER);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.documentAccess.deleteMany({
    where: {
      documentId: id,
      userId,
      role: { not: Role.OWNER },
    },
  });

  return NextResponse.json({ ok: true });
}
