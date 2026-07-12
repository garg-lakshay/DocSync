"use client";

import { type ReactNode, useState } from "react";
import { formatRelativeTime } from "@/lib/relative-time";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type VersionRow = {
  id: string;
  label: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

type VersionTimelineProps = {
  versions: VersionRow[];
  canEdit: boolean;
  saving: boolean;
  restoringId: string | null;
  onSave: () => void;
  onRestore: (versionId: string) => void;
  summarizeSlot?: ReactNode;
};

export function VersionTimeline({
  versions,
  canEdit,
  saving,
  restoringId,
  onSave,
  onRestore,
  summarizeSlot,
}: VersionTimelineProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <aside
      className="w-80 shrink-0 border-l border-border bg-surface-1 px-4 py-6"
      aria-label="Version history"
    >
      {canEdit && (
        <Button
          variant="outline"
          className="mb-3 w-full border-accent text-accent hover:bg-accent-subtle"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Version"}
        </Button>
      )}

      {summarizeSlot && <div className="mb-6">{summarizeSlot}</div>}

      <h2 className="text-sm font-semibold text-text-primary">Version history</h2>

      {versions.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No saved versions yet.</p>
      ) : (
        <ol className="relative mt-6 space-y-0">
          {versions.map((version, index) => (
            <li key={version.id} className="relative pb-8 pl-6 last:pb-0">
              {index < versions.length - 1 && (
                <span
                  className="absolute left-[7px] top-3 h-full w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <span
                className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-text-primary">
                {version.label ?? "Untitled version"}
              </p>
              <p className="mt-1 text-xs tabular-nums text-text-secondary">
                {formatRelativeTime(version.createdAt)} ·{" "}
                {version.createdBy.name ?? version.createdBy.email}
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="mt-2 text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  disabled={restoringId === version.id}
                  onClick={() => setConfirmId(version.id)}
                >
                  {restoringId === version.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring will replace the current content — save a version first if you
              want to come back to it. This snapshot is applied as a regular edit that
              syncs to all collaborators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) onRestore(confirmId);
                setConfirmId(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
