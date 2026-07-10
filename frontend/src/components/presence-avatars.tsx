import { cn } from "@/lib/utils";
import type { PresenceUser } from "@/lib/presence";
import { UserAvatar } from "@/components/user-avatar";

const MAX_VISIBLE = 4;

export function PresenceAvatars({
  users,
  className,
}: {
  users: PresenceUser[];
  className?: string;
}) {
  const unique = users.filter(
    (user, index, arr) => arr.findIndex((u) => u.id === user.id) === index
  );

  if (unique.length === 0) return null;

  const visible = unique.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, unique.length - MAX_VISIBLE);

  return (
    <div className={cn("flex items-center", className)} aria-label="Collaborators online">
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <span
            key={user.id}
            title={user.name}
            className="inline-flex rounded-full ring-2 ring-surface-1"
          >
            <UserAvatar userId={user.id} name={user.name} size="sm" />
          </span>
        ))}
        {overflowCount > 0 && (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-1 text-[10px] font-medium text-text-secondary ring-2 ring-surface-1"
            title={`${overflowCount} more`}
          >
            {`+${overflowCount}`}
          </span>
        )}
      </div>
    </div>
  );
}
