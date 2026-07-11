import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return encoder.encode(secret);
}

export type InvitePayload = {
  documentId: string;
  role: Role;
};

export async function createInviteToken(
  documentId: string,
  role: Role
): Promise<string> {
  return new SignJWT({ purpose: "invite", documentId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyInviteToken(
  token: string
): Promise<InvitePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.purpose !== "invite" ||
      typeof payload.documentId !== "string" ||
      (payload.role !== Role.EDITOR && payload.role !== Role.VIEWER)
    ) {
      return null;
    }
    return { documentId: payload.documentId, role: payload.role };
  } catch {
    return null;
  }
}

export function buildInviteUrl(token: string): string {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const url = new URL("/register", base);
  url.searchParams.set("invite", token);
  return url.toString();
}
