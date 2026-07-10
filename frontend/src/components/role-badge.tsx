import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { Role } from "@prisma/client";
import { roleLabel } from "@/lib/roles";

const roleStyles: Record<Role, string> = {
  OWNER: "bg-accent-subtle text-accent",
  EDITOR: "border border-border text-text-primary",
  VIEWER: "text-text-secondary",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        roleStyles[role],
        role === Role.EDITOR && "border",
        className
      )}
      aria-label={`Role: ${roleLabel(role)}`}
    >
      {role === Role.VIEWER && <Lock className="h-3 w-3" aria-hidden="true" />}
      {roleLabel(role)}
    </span>
  );
}
