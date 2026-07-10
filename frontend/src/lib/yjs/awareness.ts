import type { PresenceUser } from "@/lib/presence";

export function localAwarenessUser(userId: string, userName: string) {
  return {
    id: userId,
    name: userName,
    color: `#${userId.slice(0, 6)}`,
  };
}

export function parseAwarenessUsers(
  states: Map<number, Record<string, unknown>>
): PresenceUser[] {
  const users = new Map<string, PresenceUser>();

  states.forEach((state) => {
    const user = state.user as { id?: string; name?: string } | undefined;
    if (!user?.name || !user?.id) return;
    users.set(user.id, { id: user.id, name: user.name });
  });

  return Array.from(users.values());
}
