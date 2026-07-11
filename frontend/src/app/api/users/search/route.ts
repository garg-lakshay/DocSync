import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { userSearchSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = userSearchSchema.safeParse({
    q: searchParams.get("q") ?? "",
    documentId: searchParams.get("documentId") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { q, documentId } = parsed.data;
  const document = await getDocumentForUser(
    documentId,
    session.user.id,
    Role.OWNER
  );

  if (!document) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingAccess = await prisma.documentAccess.findMany({
    where: { documentId },
    select: { userId: true },
  });

  const excludedIds = new Set([
    session.user.id,
    ...existingAccess.map((row) => row.userId),
  ]);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludedIds] },
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, name: true },
    take: 5,
    orderBy: { email: "asc" },
  });

  return NextResponse.json(
    users.map((user) => ({
      userId: user.id,
      email: user.email,
      name: user.name ?? user.email,
    }))
  );
}
