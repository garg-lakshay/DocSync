import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";

export type DocumentWithRole = Prisma.DocumentGetPayload<{
  include: {
    owner: { select: { id: true; name: true; email: true } };
  };
}> & { role: Role };

export async function getDocumentForUser(
  documentId: string,
  userId: string,
  minRole: Role = Role.VIEWER
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

export async function listDocumentsForUser(userId: string) {
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

  return rows.map((row) => ({
    ...row.document,
    role: row.role,
  }));
}
