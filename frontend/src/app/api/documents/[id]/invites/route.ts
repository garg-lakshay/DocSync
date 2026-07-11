import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getDocumentForUser } from "@/lib/documents";
import {
  isEmailConfigured,
  queueDocumentInviteEmail,
} from "@/lib/email/send-invite";
import { buildInviteUrl, createInviteToken } from "@/lib/invite-token";
import { createInviteSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const token = await createInviteToken(id, parsed.data.role);
  const url = buildInviteUrl(token);

  let emailQueued = false;
  if (parsed.data.email) {
    emailQueued = queueDocumentInviteEmail({
      to: parsed.data.email,
      inviteUrl: url,
      documentTitle: document.title,
      inviterName: session.user.name ?? session.user.email ?? "A DocSync user",
      role: parsed.data.role,
    });
  }

  return NextResponse.json({
    url,
    token,
    emailQueued,
    emailConfigured: isEmailConfigured(),
  });
}
