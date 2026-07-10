import { Role } from "@prisma/client";

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
