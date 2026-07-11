"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SummarizeDialogProps = {
  documentId: string;
  getPlainText: () => string;
  className?: string;
};

export function SummarizeDialog({
  documentId,
  getPlainText,
  className,
}: SummarizeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    const plainText = getPlainText();
    if (!plainText.trim()) {
      toast.error("Document is empty");
      return;
    }

    setOpen(true);
    setLoading(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plainText }),
      });

      if (!response.ok) {
        setError("Could not generate summary. Try again.");
        return;
      }

      const data = (await response.json()) as { summary: string };
      setSummary(data.summary);
    } catch {
      setError("Could not generate summary. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    toast.success("Summary copied");
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={summarize}
        disabled={loading}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? "Summarizing…" : "Summarize"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document summary</DialogTitle>
          </DialogHeader>

          {loading && (
            <p className="text-sm text-text-secondary">Generating summary…</p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {summary && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {summary}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            {summary && (
              <Button variant="outline" size="sm" onClick={copySummary}>
                Copy
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
