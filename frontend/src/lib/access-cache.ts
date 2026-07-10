import { Role } from "@prisma/client";

export type AccessMember = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

const STORAGE_PREFIX = "docsync-access:";

export function getStoredAccess(documentId: string): AccessMember[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${documentId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AccessMember[];
  } catch {
    return [];
  }
}

export function storeAccessMember(documentId: string, member: AccessMember) {
  const existing = getStoredAccess(documentId).filter(
    (m) => m.userId !== member.userId
  );
  localStorage.setItem(
    `${STORAGE_PREFIX}${documentId}`,
    JSON.stringify([...existing, member])
  );
}

export function updateStoredMemberRole(
  documentId: string,
  userId: string,
  role: Role
) {
  const members = getStoredAccess(documentId).map((m) =>
    m.userId === userId ? { ...m, role } : m
  );
  localStorage.setItem(`${STORAGE_PREFIX}${documentId}`, JSON.stringify(members));
}
