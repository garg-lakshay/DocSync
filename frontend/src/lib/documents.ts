import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";

const Role = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

type DocumentRole = (typeof Role)[keyof typeof Role];

type DocumentOwner = {
  id: string;
  name: string | null;
  email: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  ownerId: string;
  ydocState: Uint8Array | null;
  createdAt: Date;
  updatedAt: Date;
  owner: DocumentOwner;
};

export type DocumentWithRole = DocumentRecord & { role: DocumentRole };

type AccessWithDocument = {
  role: DocumentRole;
  document: DocumentRecord;
};

export async function getDocumentForUser(
  documentId: string,
  userId: string,
  minRole: DocumentRole = Role.VIEWER
): Promise<DocumentWithRole | null> {
  const access = await prisma.documentAccess.findUnique({
    where: {
      documentId_userId: { documentId, userId },
    },
    include: {
      document: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!access || !hasMinRole(access.role, minRole)) {
    return null;
  }

  return { ...access.document, role: access.role };
}

export async function listDocumentsForUser(
  userId: string
): Promise<DocumentWithRole[]> {
  const rows = await prisma.documentAccess.findMany({
    where: { userId },
    include: {
      document: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return rows.map((row: AccessWithDocument) => ({
    ...row.document,
    role: row.role,
  }));
}
