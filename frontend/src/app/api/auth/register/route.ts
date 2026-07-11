import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken } from "@/lib/invite-token";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  let redirectTo = "/documents";

  if (parsed.data.inviteToken) {
    const invite = await verifyInviteToken(parsed.data.inviteToken);
    if (invite) {
      await prisma.documentAccess.create({
        data: {
          documentId: invite.documentId,
          userId: user.id,
          role: invite.role,
        },
      });
      redirectTo = `/documents/${invite.documentId}`;
    }
  }

  return NextResponse.json({ ...user, redirectTo }, { status: 201 });
}
