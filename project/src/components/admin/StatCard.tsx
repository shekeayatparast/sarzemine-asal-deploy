import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { toPersianDigits } from "@/lib/format";

interface AdminStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  growthPct?: number | null;
  growthLabel?: string;
  hint?: string;
  hintClassName?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  growthPct,
  growthLabel = "نسبت به دوره قبل",
  hint,
  hintClassName,
  className,
}: AdminStatCardProps) {
  const hasGrowth = growthPct !== null && growthPct !== undefined;
  const isPositive = (growthPct ?? 0) >= 0;

  return (
    <Card className={cn("p-5 gap-0 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1.5">{title}</p>
          <p className="text-xl md:text-2xl font-extrabold text-foreground break-words leading-tight">
            {value}
          </p>
          {hasGrowth && (
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md",
                  isPositive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                )}
              >
                {isPositive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {toPersianDigits(Math.abs(growthPct!))}٪
              </span>
              <span className="text-muted-foreground">{growthLabel}</span>
            </div>
          )}
          {hint && !hasGrowth && (
            <p
              className={cn(
                "mt-2 text-xs text-muted-foreground",
                hintClassName
              )}
            >
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-honey-light/40 text-honey-dark",
            iconClassName
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
