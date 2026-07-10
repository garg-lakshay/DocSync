import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Works offline",
    description:
      "Edits save locally the instant you type, network or not.",
    icon: "⚡",
  },
  {
    title: "Syncs in real time",
    description:
      "Reconnect and every change merges automatically, yours and theirs.",
    icon: "🔄",
  },
  {
    title: "Full version history",
    description:
      "Save a snapshot any time, restore it without losing anyone's current work.",
    icon: "🕐",
  },
];

type LandingContentProps = {
  showNav?: boolean;
};

export function LandingContent({ showNav = true }: LandingContentProps) {
  return (
    <div className="flex flex-1 flex-col">
      {showNav && (
        <header className="border-b border-border bg-surface-1">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <span className="text-sm font-semibold text-text-primary">DocSync</span>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-text-secondary">
          LOCAL-FIRST · REAL-TIME · VERSIONED
        </p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-text-primary md:text-5xl">
          Write offline. Sync automatically.
          <br />
          Never lose a version.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
          DocSync keeps editing instantly even without a connection, merges
          changes the moment you&apos;re back online, and lets you step back to
          any point in a document&apos;s history.
        </p>
        <Button asChild className="mt-8">
          <Link href="/register">Get started →</Link>
        </Button>

        <div
          className="mx-auto mt-12 max-w-3xl rounded-[10px] border border-border bg-surface-1 p-4 shadow-[0_0_60px_-20px_rgba(107,127,240,0.35)]"
          aria-hidden="true"
        >
          <div className="rounded-md border border-border bg-bg p-4 text-left">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary">
                  ● Connected
                </span>
                <div className="flex -space-x-2">
                  <span className="h-6 w-6 rounded-full bg-accent text-[9px] leading-6 text-white">LG</span>
                  <span className="h-6 w-6 rounded-full bg-online text-[9px] leading-6 text-bg">AK</span>
                </div>
              </div>
              <span className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary">
                Share
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="rounded-md border border-border bg-surface-1 p-4 font-serif text-sm text-text-primary">
                Your document content appears here with Source Serif 4 typography.
              </div>
              <div className="rounded-md border border-border bg-surface-1 p-3 text-xs text-text-secondary">
                <p className="font-medium text-text-primary">Version history</p>
                <p className="mt-2">● Added pricing section</p>
                <p className="mt-1">● Initial draft</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface-1">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[10px] border border-border bg-bg p-6 text-left"
            >
              <p className="text-2xl">{feature.icon}</p>
              <h2 className="mt-3 text-sm font-semibold text-text-primary">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function LandingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="blur-[6px]">
        <LandingContent showNav />
      </div>
      <div className="absolute inset-0 bg-[rgba(10,10,11,0.6)]" />
    </div>
  );
}
