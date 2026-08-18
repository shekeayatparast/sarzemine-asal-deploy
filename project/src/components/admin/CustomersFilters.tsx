"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Users,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toPersianDigits } from "@/lib/format";

/**
 * Filters + pagination controls for the admin customer list page.
 * Mirrors the AgentsFilters pattern (single search input + URL state),
 * with server-side pagination controls appended at the bottom.
 */
export function CustomersFilters({
  page,
  totalPages,
  totalCount,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  const updateParams = (next: {
    search?: string | null;
    page?: number | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.search !== undefined) {
      if (next.search === null || next.search === "") params.delete("search");
      else params.set("search", next.search);
    }
    if (next.page !== undefined) {
      if (next.page === null || next.page === 1) params.delete("page");
      else params.set("page", String(next.page));
    }
    startTransition(() => {
      router.push(`/admin/customers?${params.toString()}`);
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to page 1 when applying a new search
    updateParams({ search: search.trim() || null, page: 1 });
  };

  const clearSearch = () => {
    setSearch("");
    updateParams({ search: null, page: 1 });
  };

  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (initialSearch) sp.set("search", initialSearch);
    if (n > 1) sp.set("page", String(n));
    return `/admin/customers?${sp.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Search input + count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={submitSearch} className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="جستجو بر اساس نام یا تلفن مشتری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 pl-9"
            inputMode="search"
            dir="rtl"
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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          مجموع {toPersianDigits(totalCount)} مشتری
        </div>
      </div>

      {/* Pagination controls — server-side pagination via URL page param */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-3 border-t">
          {hasPrev ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>
                <ArrowRight className="w-4 h-4 ml-1" />
                قبلی
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ArrowRight className="w-4 h-4 ml-1" />
              قبلی
            </Button>
          )}

          <span className="text-sm text-muted-foreground whitespace-nowrap">
            صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
          </span>

          {hasNext ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>
                بعدی
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              بعدی
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
