"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";

const HIDDEN_PREFIXES = ["/login", "/register"];

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  if (pathname === "/" && !session) {
    return null;
  }

  const userName = session?.user?.name ?? session?.user?.email ?? "User";
  const userId = session?.user?.id ?? "anon";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-1">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href={session ? "/documents" : "/"}
          className="text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          DocSync
        </Link>

        {session && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <UserAvatar userId={userId} name={userName} size="sm" />
              <span className="hidden text-sm text-text-secondary sm:inline">
                {userName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-danger focus:text-danger"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
