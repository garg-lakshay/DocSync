"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import { toast } from "sonner";
import { RoleBadge } from "@/components/role-badge";
import { ConnectionStatusPill } from "@/components/connection-status";
import { PresenceAvatars } from "@/components/presence-avatars";
import { ShareModal } from "@/components/share-modal";
import { EditorToolbar } from "@/components/editor-toolbar";
import { VersionTimeline } from "@/components/version-timeline";
import { encodeSnapshot, restoreFromSnapshot } from "@/lib/ydoc";
import { cacheDocumentMeta } from "@/lib/document-cache";
import type { PresenceUser } from "@/lib/presence";
import { localAwarenessUser, parseAwarenessUsers } from "@/lib/yjs/awareness";
import { cn } from "@/lib/utils";

const Role = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

type Role = (typeof Role)[keyof typeof Role];

type ConnectionStatus = "connecting" | "connected" | "offline" | "syncing";

type VersionRow = {
  id: string;
  label: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

type DocumentEditorProps = {
  documentId: string;
  title: string;
  role: Role;
  userId: string;
  userName: string;
};

export function DocumentEditor({
  documentId,
  title,
  role,
  userId,
  userName,
}: DocumentEditorProps) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const canEdit = role === Role.OWNER || role === Role.EDITOR;
  const canShare = role === Role.OWNER;

  useEffect(() => {
    cacheDocumentMeta({ id: documentId, title, role, userId, userName });
  }, [documentId, title, role, userId, userName]);

  const ydoc = useMemo(() => {
    if (!ydocRef.current) ydocRef.current = new Y.Doc();
    return ydocRef.current;
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Collaboration.configure({ document: ydoc }),
      ],
      editable: canEdit,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "outline-none",
          "aria-label": "Document editor",
        },
      },
    },
    [canEdit, ydoc]
  );

  useEffect(() => {
    const persistence = new IndexeddbPersistence(documentId, ydoc);

    function setOfflineStatus() {
      setStatus("offline");
    }

    async function connect() {
      if (!navigator.onLine) {
        setOfflineStatus();
        return;
      }

      setStatus("connecting");

      let token: string;
      try {
        const tokenRes = await fetch("/api/auth/ws-token");
        if (!tokenRes.ok) {
          setOfflineStatus();
          return;
        }
        ({ token } = (await tokenRes.json()) as { token: string });
      } catch {
        setOfflineStatus();
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
      const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
        params: { userId, token },
        connect: true,
      });
      providerRef.current = provider;

      provider.awareness.setLocalStateField("user", localAwarenessUser(userId, userName));

      const handleStatus = ({ status: wsStatus }: { status: string }) => {
        if (wsStatus === "connected") setStatus("connected");
        else if (wsStatus === "connecting") setStatus("connecting");
        else setStatus("offline");
      };

      const handleSync = (isSynced: boolean) => {
        if (isSynced && provider.wsconnected) setStatus("connected");
        else if (provider.wsconnected) setStatus("syncing");
      };

      const updatePresence = () => {
        setPresenceUsers(parseAwarenessUsers(provider.awareness.getStates()));
      };

      provider.on("status", handleStatus);
      provider.on("sync", handleSync);
      provider.awareness.on("change", updatePresence);
      updatePresence();

      return () => {
        provider.awareness.off("change", updatePresence);
        provider.off("status", handleStatus);
        provider.off("sync", handleSync);
        provider.destroy();
        providerRef.current = null;
      };
    }

    let cleanupProvider: (() => void) | undefined;
    connect().then((cleanup) => {
      cleanupProvider = cleanup;
    });

    window.addEventListener("offline", setOfflineStatus);
    window.addEventListener("online", () => {
      cleanupProvider?.();
      connect().then((cleanup) => {
        cleanupProvider = cleanup;
      });
    });

    return () => {
      window.removeEventListener("offline", setOfflineStatus);
      cleanupProvider?.();
      persistence.destroy();
    };
  }, [documentId, userId, userName, ydoc]);

  useEffect(() => {
    if (!navigator.onLine) return;
    fetch(`/api/documents/${documentId}/versions`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json() as Promise<VersionRow[]>;
      })
      .then(setVersions)
      .catch(() => toast.error("Could not load version history"));
  }, [documentId]);

  async function saveVersion() {
    if (!canEdit) return;
    setSavingVersion(true);

    const snapshot = encodeSnapshot(ydoc);
    const plainText = editor?.getText() ?? "";

    const response = await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ydocSnapshot: snapshot, plainText }),
    });

    if (!response.ok) {
      toast.error("Failed to save version");
      setSavingVersion(false);
      return;
    }

    const version = (await response.json()) as VersionRow;
    setVersions((prev) => [version, ...prev]);
    toast.success("Version saved");
    setSavingVersion(false);
  }

  async function restoreVersion(versionId: string) {
    if (!canEdit) return;
    setRestoringId(versionId);

    const response = await fetch(
      `/api/documents/${documentId}/versions/${versionId}`
    );

    if (!response.ok) {
      toast.error("Failed to restore version");
      setRestoringId(null);
      return;
    }

    const data = (await response.json()) as { ydocSnapshot: string };
    restoreFromSnapshot(ydoc, data.ydocSnapshot);
    toast.success("Version restored");
    setRestoringId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-1 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/documents"
            className="shrink-0 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ← Documents
          </Link>
          <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
          <RoleBadge role={role} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ConnectionStatusPill status={status} />
          <PresenceAvatars users={presenceUsers} className="mr-2" />
          <ShareModal documentId={documentId} canManage={canShare} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col overflow-y-auto",
            !canEdit && "bg-bg/80"
          )}
        >
          {canEdit && <EditorToolbar editor={editor} />}
          <div className="flex flex-1 justify-center px-6 py-8">
            <div className="editor-content w-full max-w-[680px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <VersionTimeline
          versions={versions}
          canEdit={canEdit}
          saving={savingVersion}
          restoringId={restoringId}
          onSave={saveVersion}
          onRestore={restoreVersion}
        />
      </div>
    </div>
  );
}
