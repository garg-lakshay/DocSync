import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { listDocumentsForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await listDocumentsForUser(session.user.id);
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title,
      ownerId: session.user.id,
      access: {
        create: {
          userId: session.user.id,
          role: Role.OWNER,
        },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ...document, role: Role.OWNER }, { status: 201 });
}
