import { cn } from "@/lib/utils";

type ConnectionStatus = "connecting" | "connected" | "offline" | "syncing";

const config: Record<
  ConnectionStatus,
  { dot: string; label: string; pulse?: boolean; title?: string }
> = {
  connected: { dot: "bg-online", label: "Connected" },
  syncing: { dot: "bg-syncing", label: "Syncing…", pulse: true },
  offline: {
    dot: "bg-offline",
    label: "Offline",
    title: "Offline — changes saved locally",
  },
  connecting: { dot: "bg-syncing", label: "Connecting…", pulse: true },
};

export function ConnectionStatusPill({ status }: { status: ConnectionStatus }) {
  const { dot, label, pulse, title } = config[status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-text-secondary"
      title={title}
      aria-live="polite"
    >
      <span
        className={cn("h-2 w-2 rounded-full", dot, pulse && "sync-pulse")}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
