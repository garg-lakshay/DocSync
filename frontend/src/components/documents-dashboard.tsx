"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RoleBadge } from "@/components/role-badge";
import { formatRelativeTime } from "@/lib/relative-time";
import { cacheDocumentMeta } from "@/lib/document-cache";

type DocumentRow = {
  id: string;
  title: string;
  updatedAt: string;
  role: Role;
  owner: { name: string | null; email: string };
};

export function DocumentsDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load documents");
        return res.json() as Promise<DocumentRow[]>;
      })
      .then((docs) => {
        setDocuments(docs);
        if (session?.user?.id) {
          const userName = session.user.name ?? session.user.email ?? "User";
          docs.forEach((doc) =>
            cacheDocumentMeta({
              id: doc.id,
              title: doc.title,
              role: doc.role,
              userId: session.user!.id,
              userName,
            })
          );
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session?.user?.id, session?.user?.name, session?.user?.email]);

  async function createDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    setError(null);

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (!response.ok) {
      setError("Could not create document");
      setCreating(false);
      return;
    }

    const document = (await response.json()) as DocumentRow;
    router.push(`/documents/${document.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">Documents</h1>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          New document
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={createDocument}
          className="mb-8 flex gap-2 rounded-[10px] border border-border bg-surface p-4"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            aria-label="Document title"
            autoFocus
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-text-secondary">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface px-8 py-16 text-center">
          <p className="text-text-secondary">
            No documents yet. Create one to get started.
          </p>
          <Button className="mt-6" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New document
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`} className="block h-full">
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text-primary">{doc.title}</p>
                    <RoleBadge role={doc.role} />
                  </div>
                  <p className="text-xs tabular-nums text-text-secondary">
                    Edited {formatRelativeTime(doc.updatedAt)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
