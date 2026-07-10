import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createWsToken } from "@/lib/ws-token";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await createWsToken(session.user.id);
  return NextResponse.json({ token, userId: session.user.id });
}
