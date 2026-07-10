const AVATAR_HUES = [
  "#3B5BDB",
  "#5B7FDB",
  "#7B5BDB",
  "#3B8BDB",
  "#3BDB8B",
  "#DB8B3B",
];

export function avatarColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
}

export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export type PresenceUser = {
  id: string;
  name: string;
};
