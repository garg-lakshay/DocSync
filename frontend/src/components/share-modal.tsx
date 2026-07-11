"use client";

import { useEffect, useRef, useState } from "react";
import { Role } from "@prisma/client";
import { Copy, Link2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  documentTitle?: string;
  canManage: boolean;
};

type SearchUser = {
  userId: string;
  email: string;
  name: string;
};

function RoleSelect({
  value,
  onChange,
  className,
}: {
  value: Role;
  onChange: (role: Role) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger className={className}>
        <SelectValue>{roleLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={Role.EDITOR}>Can edit</SelectItem>
        <SelectItem value={Role.VIEWER}>Can view</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ShareModal({
  documentId,
  documentTitle,
  canManage,
}: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shareRole, setShareRole] = useState<Role>(Role.EDITOR);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [owner, setOwner] = useState<AccessMember | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      setInfo(null);
      setSearchOpen(false);
      setSearchResults([]);
    }
  }

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

  useEffect(() => {
    if (!open || !canManage) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (email.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams({
          q: email.trim(),
          documentId,
        });
        const res = await fetch(`/api/users/search?${params}`);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const users = (await res.json()) as SearchUser[];
        setSearchResults(users);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email, documentId, open, canManage]);

  function selectUser(user: SearchUser) {
    setEmail(user.email);
    setSearchOpen(false);
    setError(null);
    setInfo(null);
  }

  async function createInviteLink(
    role: Role,
    recipientEmail?: string
  ): Promise<{
    url: string;
    emailQueued: boolean;
    emailConfigured: boolean;
  } | null> {
    const res = await fetch(`/api/documents/${documentId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        ...(recipientEmail ? { email: recipientEmail } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      url: string;
      emailQueued: boolean;
      emailConfigured: boolean;
    };
    setInviteLink(data.url);
    return data;
  }

  async function handleCopyInviteLink() {
    setLinkLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await createInviteLink(shareRole);
      if (!result) {
        setError("Could not create invite link. Try again.");
        return;
      }
      await navigator.clipboard.writeText(result.url);
      toast.success("Invite link copied to clipboard");
    } finally {
      setLinkLoading(false);
    }
  }

  async function invite() {
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setInfo(null);
    setSearchOpen(false);

    const response = await fetch(`/api/documents/${documentId}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, role: shareRole }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      if (data.error === "User not found") {
        const inviteResult = await createInviteLink(shareRole, trimmed);
        if (!inviteResult) {
          setError("Could not send invite. Try again.");
          setLoading(false);
          return;
        }

        if (inviteResult.emailQueued) {
          toast.success(`Invite email sent to ${trimmed}`);
          setEmail("");
        } else if (!inviteResult.emailConfigured) {
          setInfo(
            "No account found for that email. Email is not configured — use Copy link below."
          );
        } else {
          setInfo(
            "No account found. An invite link was created — copy it from the link section below."
          );
        }
        setLoading(false);
        return;
      }
      setError("Could not share this document.");
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
    toast.success(`Added ${access.email} as ${roleLabel(access.role)}`);
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

  const shareTitle = documentTitle ? `Share “${documentTitle}”` : "Share document";
  const showSuggestions = searchOpen && email.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={canManage ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          title={
            canManage
              ? "Invite people or copy an invite link"
              : "View who has access"
          }
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(85vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12">
          <DialogHeader className="mb-0">
            <DialogTitle>{shareTitle}</DialogTitle>
            <DialogDescription>
              {canManage
                ? "Invite people by email or share a link with anyone."
                : "People who can view or edit this document."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {canManage && (
            <div className="space-y-6">
              <section aria-labelledby="share-add-people" className="space-y-3">
                <h3
                  id="share-add-people"
                  className="text-sm font-medium text-text-primary"
                >
                  Add people
                </h3>

                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                      setInfo(null);
                    }}
                    onFocus={() => {
                      if (email.trim().length >= 2) setSearchOpen(true);
                    }}
                    aria-label="Email address"
                    autoComplete="off"
                    className="min-w-0 flex-1"
                  />
                  <RoleSelect
                    value={shareRole}
                    onChange={setShareRole}
                    className="w-[7.5rem] shrink-0"
                  />
                  <Button
                    onClick={invite}
                    disabled={loading || !email.trim()}
                    className="shrink-0 px-4"
                  >
                    {loading ? "…" : "Invite"}
                  </Button>
                </div>

                {showSuggestions && (
                  <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
                    {searchLoading ? (
                      <p className="px-3 py-2.5 text-sm text-text-secondary">
                        Searching…
                      </p>
                    ) : searchResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-text-secondary">
                        No existing users match. Click Invite to email them a link
                        or add them if they already have an account.
                      </p>
                    ) : (
                      <ul className="scrollbar-themed max-h-36 overflow-y-auto py-1">
                        {searchResults.map((user) => (
                          <li key={user.userId}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent-subtle"
                              onClick={() => selectUser(user)}
                            >
                              <UserAvatar
                                userId={user.userId}
                                name={user.name}
                                size="sm"
                              />
                              <span className="min-w-0 truncate">
                                <span className="block text-text-primary">
                                  {user.name}
                                </span>
                                <span className="block text-xs text-text-secondary">
                                  {user.email}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {error && (
                  <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-text-secondary">
                    {info}
                  </p>
                )}
              </section>

              <section
                aria-labelledby="share-invite-link"
                className="space-y-3 border-t border-border pt-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                    <Link2 className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="share-invite-link"
                      className="text-sm font-medium text-text-primary"
                    >
                      General access
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Anyone with the link can sign up and join this document.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RoleSelect
                    value={shareRole}
                    onChange={(role) => {
                      setShareRole(role);
                      setInviteLink(null);
                    }}
                    className="w-[7.5rem] shrink-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-0 flex-1"
                    onClick={handleCopyInviteLink}
                    disabled={linkLoading}
                  >
                    <Copy className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    {linkLoading ? "Creating link…" : "Copy link"}
                  </Button>
                </div>

                {inviteLink && (
                  <div className="rounded-md border border-border bg-surface-1 px-3 py-2">
                    <p className="mb-1 text-xs font-medium text-text-secondary">
                      Invite link
                    </p>
                    <p className="break-all text-xs text-text-primary">
                      {inviteLink}
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          <section
            aria-labelledby="share-people-access"
            className={canManage ? "mt-6 border-t border-border pt-6" : "mt-2"}
          >
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary" aria-hidden />
              <h3
                id="share-people-access"
                className="text-sm font-medium text-text-primary"
              >
                People with access
              </h3>
              <span className="text-xs text-text-secondary">
                ({allMembers.length})
              </span>
            </div>
            {allMembers.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Only you have access right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {allMembers.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        userId={member.userId}
                        name={member.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    {member.role === Role.OWNER ? (
                      <span className="shrink-0 text-xs text-text-secondary">
                        Owner
                      </span>
                    ) : canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => changeRole(member, v as Role)}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue>{roleLabel(member.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Role.EDITOR}>Can edit</SelectItem>
                          <SelectItem value={Role.VIEWER}>Can view</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="shrink-0 text-xs text-text-secondary">
                        {roleLabel(member.role)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
