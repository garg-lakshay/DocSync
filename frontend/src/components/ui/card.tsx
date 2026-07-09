import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-surface-1 transition-colors hover:border-border-hover",
        className
      )}
      {...props}
    />
  );
}
