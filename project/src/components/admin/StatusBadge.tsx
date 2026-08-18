import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "در انتظار تأیید",
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
    dot: "bg-amber-500",
  },
  active: {
    label: "فعال",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
    dot: "bg-emerald-500",
  },
  blocked: {
    label: "مسدود",
    className:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700",
    dot: "bg-red-500",
  },
  rejected: {
    label: "رد شده",
    className:
      "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700",
    dot: "bg-rose-500",
  },
};

export function StatusBadge({
  status,
  showDot = true,
  className,
}: {
  status: string;
  showDot?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status] || {
    label: status,
    className: "",
    dot: "bg-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium px-2.5 py-0.5 rounded-full gap-1.5",
        meta.className,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("inline-block w-1.5 h-1.5 rounded-full", meta.dot)}
        />
      )}
      {meta.label}
    </Badge>
  );
}

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}
