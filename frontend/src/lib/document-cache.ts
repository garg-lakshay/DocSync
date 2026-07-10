import { Role } from "@prisma/client";

export type CachedDocumentMeta = {
  id: string;
  title: string;
  role: Role;
  userId: string;
  userName: string;
};

const CACHE_PREFIX = "docsync-doc-meta:";

export function cacheDocumentMeta(meta: CachedDocumentMeta) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${CACHE_PREFIX}${meta.id}`, JSON.stringify(meta));
}

export function getCachedDocumentMeta(
  documentId: string
): CachedDocumentMeta | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(`${CACHE_PREFIX}${documentId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CachedDocumentMeta;
  } catch {
    return null;
  }
}
