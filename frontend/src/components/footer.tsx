import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-1 px-6 py-4 text-sm text-text-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>DocSync — Lakshay Garg</span>
        <div className="flex gap-4">
          <Link
            href="https://github.com/garg-lakshay"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/lakshay-garg-90327328a/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            LinkedIn
          </Link>
        </div>
      </div>
    </footer>
  );
}
