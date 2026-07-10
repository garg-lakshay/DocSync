"use client";

import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import {
  getStoredAccess,
  storeAccessMember,
  updateStoredMemberRole,
  type AccessMember,
} from "@/lib/access-cache";
import { roleLabel } from "@/lib/roles";

type ShareModalProps = {
  documentId: string;
  canManage: boolean;
};

export function ShareModal({ documentId, canManage }: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.EDITOR);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [owner, setOwner] = useState<AccessMember | null>(null);

  useEffect(() => {
    if (!open) return;

    async function load() {
      const stored = getStoredAccess(documentId);
      setMembers(stored);

      try {
        const res = await fetch(`/api/documents/${documentId}/access`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          owner: { id: string; email: string; name: string | null };
          members: AccessMember[];
        };
        setOwner({
          userId: data.owner.id,
          email: data.owner.email,
          name: data.owner.name ?? data.owner.email,
          role: Role.OWNER,
        });
        setMembers(data.members.filter((m) => m.userId !== data.owner.id));
      } catch {
        // offline — use stored only
      }
    }

    load();
  }, [open, documentId]);

  async function invite() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: inviteRole }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(
        data.error === "User not found"
          ? "No account found for that email."
          : "Could not share this document."
      );
      setLoading(false);
      return;
    }

    const access = (await response.json()) as AccessMember;

    storeAccessMember(documentId, access);
    setMembers((prev) => [
      ...prev.filter((m) => m.userId !== access.userId),
      access,
    ]);
    setEmail("");
    toast.success(`Invited ${access.email} as ${roleLabel(access.role)}`);
    setLoading(false);
  }

  async function changeRole(member: AccessMember, role: Role) {
    const response = await fetch(`/api/documents/${documentId}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: member.email, role }),
    });

    if (!response.ok) {
      toast.error("Could not update role");
      return;
    }

    updateStoredMemberRole(documentId, member.userId, role);
    setMembers((prev) =>
      prev.map((m) => (m.userId === member.userId ? { ...m, role } : m))
    );
    toast.success("Role updated");
  }

  const allMembers = [
    ...(owner ? [owner] : []),
    ...members.filter((m) => m.userId !== owner?.userId),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canManage}>
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
        </DialogHeader>

        {canManage && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as Role)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>{roleLabel(inviteRole)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.EDITOR}>Editor</SelectItem>
                  <SelectItem value={Role.VIEWER}>Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button onClick={invite} disabled={loading} className="w-full">
              {loading ? "Inviting…" : "Invite"}
            </Button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            People with access
          </p>
          {allMembers.length === 0 ? (
            <p className="text-sm text-text-secondary">No collaborators yet.</p>
          ) : (
            <ul className="space-y-2">
              {allMembers.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar userId={member.userId} name={member.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">{member.name}</p>
                      <p className="truncate text-xs text-text-secondary">{member.email}</p>
                    </div>
                  </div>
                  {member.role === Role.OWNER ? (
                    <span className="text-xs text-text-secondary">Owner</span>
                  ) : canManage ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => changeRole(member, v as Role)}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue>{roleLabel(member.role)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Role.EDITOR}>Editor</SelectItem>
                        <SelectItem value={Role.VIEWER}>Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-text-secondary">
                      {roleLabel(member.role)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
