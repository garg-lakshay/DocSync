"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { DocumentEditor } from "@/components/document-editor";
import {
  cacheDocumentMeta,
  getCachedDocumentMeta,
  type CachedDocumentMeta,
} from "@/lib/document-cache";

type DocumentPageClientProps = {
  documentId: string;
};

export function DocumentPageClient({ documentId }: DocumentPageClientProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [meta, setMeta] = useState<CachedDocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      const cached = getCachedDocumentMeta(documentId);
      if (cached) {
        setMeta(cached);
        setOfflineMode(!navigator.onLine);
      }

      if (!navigator.onLine) {
        if (cached) {
          setLoading(false);
          return;
        }
        setError("This document is not available offline yet. Open it once while online.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) {
          if (cached) {
            setOfflineMode(true);
            setLoading(false);
            return;
          }
          setError("Document not found or access denied.");
          setLoading(false);
          return;
        }

        const document = (await response.json()) as {
          id: string;
          title: string;
          role: Role;
        };

        if (!session?.user?.id) {
          setError("Session expired. Reconnect to sign in again.");
          setLoading(false);
          return;
        }

        const nextMeta: CachedDocumentMeta = {
          id: document.id,
          title: document.title,
          role: document.role,
          userId: session.user.id,
          userName: session.user.name ?? session.user.email ?? "User",
        };

        if (!cancelled) {
          cacheDocumentMeta(nextMeta);
          setMeta(nextMeta);
          setOfflineMode(false);
        }
      } catch {
        if (cached) {
          setOfflineMode(true);
        } else {
          setError("Could not load document. Check your connection.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      setError("Sign in required.");
      setLoading(false);
      return;
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId, session, sessionStatus]);

  useEffect(() => {
    function handleOffline() {
      setOfflineMode(true);
    }

    function handleOnline() {
      setOfflineMode(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-zinc-500">
        Loading document...
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-red-600">{error ?? "Unable to open document."}</p>
        <Link href="/documents" className="mt-4 inline-block text-sm text-zinc-700 hover:underline">
          ← Back to documents
        </Link>
      </div>
    );
  }

  return (
    <>
      {offlineMode && (
        <div
          className="border-b border-border bg-accent-subtle px-6 py-2 text-center text-sm text-accent"
          role="status"
        >
          Offline mode — edits are saved locally and will sync when you reconnect.
        </div>
      )}
      <DocumentEditor
        documentId={meta.id}
        title={meta.title}
        role={meta.role}
        userId={meta.userId}
        userName={meta.userName}
      />
    </>
  );
}
