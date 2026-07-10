import { cn } from "@/lib/utils";
import { avatarColorForUser, initialsForName } from "@/lib/presence";

type UserAvatarProps = {
  userId: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
};

const sizes = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-xs",
};

export function UserAvatar({ userId, name, size = "md", className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: avatarColorForUser(userId) }}
      aria-hidden="true"
    >
      {initialsForName(name)}
    </span>
  );
}
