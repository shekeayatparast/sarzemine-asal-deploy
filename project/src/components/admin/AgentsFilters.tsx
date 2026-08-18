"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Users, UserCheck, Ban, ShieldX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";

type StatusFilter = "all" | "pending" | "active" | "blocked" | "rejected";

const TABS: { key: StatusFilter; label: string; icon: typeof Users }[] = [
  { key: "all", label: "همه", icon: Users },
  { key: "pending", label: "در انتظار تأیید", icon: Clock },
  { key: "active", label: "فعال", icon: UserCheck },
  { key: "blocked", label: "مسدود", icon: Ban },
  { key: "rejected", label: "رد شده", icon: ShieldX },
];

export function AgentsFilters({
  counts,
}: {
  counts: Record<StatusFilter, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [, startTransition] = useTransition();

  const currentStatus = (searchParams.get("status") || "all") as StatusFilter;

  const updateParams = (next: { status?: StatusFilter; search?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.status) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    if (next.search !== undefined) {
      if (next.search === null || next.search === "") params.delete("search");
      else params.set("search", next.search);
    }
    startTransition(() => {
      router.push(`/admin/agents?${params.toString()}`);
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: search.trim() || null });
  };

  const clearSearch = () => {
    setSearch("");
    updateParams({ search: null });
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentStatus === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <Button
              key={tab.key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => updateParams({ status: tab.key })}
              className={cn(
                "gap-1.5",
                active
                  ? "bg-honey-gradient text-primary-foreground hover:opacity-90"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {toPersianDigits(count)}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Search input */}
      <form onSubmit={submitSearch} className="relative w-full max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="جستجو بر اساس نام، فروشگاه یا تلفن..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9 pl-9"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="پاک کردن جستجو"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}
