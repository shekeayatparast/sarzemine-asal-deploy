"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useNav, useCart } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, ShoppingBasket, UserCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";
import Image from "next/image";

const NAV_ITEMS = [
  { key: "home", label: "خانه" },
  { key: "products", label: "محصولات" },
  { key: "benefits", label: "خواص عسل" },
  { key: "about", label: "درباره ما" },
  { key: "track", label: "پیگیری سفارش" },
  { key: "contact", label: "تماس با ما" },
] as const;

export function Header() {
  const { view, navigate } = useNav();
  const totalCount = useCart((s) => s.totalCount());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (v: typeof NAV_ITEMS[number]["key"]) => {
    navigate(v);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-md shadow-md border-b border-border/60"
          : "bg-background/70 backdrop-blur-sm"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 md:h-20 items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => go("home")}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="سرزمین عسل - خانه"
          >
            <div className="relative w-11 h-11 md:w-14 md:h-14 shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/images/logo.png"
                alt="لوگوی سرزمین عسل"
                fill
                sizes="56px"
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            <div className="text-right leading-tight">
              <div className="font-extrabold text-lg md:text-xl text-honey-dark">
                سرزمین عسل
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground -mt-0.5">
                عسل طبیعی و خالص
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.key}
                variant={view === item.key ? "default" : "ghost"}
                size="sm"
                onClick={() => go(item.key)}
                className={cn(
                  "text-base font-medium transition-all",
                  view === item.key
                    ? "bg-honey-gradient text-primary-foreground shadow-md"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Cart + Panel links + mobile menu */}
          <div className="flex items-center gap-2">
            {/* Agent panel link */}
            <Link
              href="/agent"
              className="hidden sm:flex items-center gap-1.5 px-3 h-11 rounded-full border border-honey/30 text-honey-dark hover:bg-honey/10 hover:border-honey/50 transition-all text-sm font-medium"
              title="پنل نمایندگان فروش"
            >
              <UserCircle className="w-4 h-4" />
              <span>پنل نماینده</span>
            </Link>

            {/* Admin panel link */}
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 h-11 rounded-full border border-honey/30 text-honey-dark hover:bg-honey/10 hover:border-honey/50 transition-all text-sm font-medium"
              title="پنل مدیریت"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>پنل مدیریت</span>
            </Link>

            <Button
              onClick={() => go("cart")}
              variant={view === "cart" ? "default" : "outline"}
              size="icon"
              className="relative w-11 h-11 rounded-full shrink-0"
              aria-label="سبد خرید"
            >
              <ShoppingBasket className="w-5 h-5" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-honey-dark text-primary-foreground text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow animate-fade-in-up">
                  {toPersianDigits(totalCount)}
                </span>
              )}
            </Button>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden w-11 h-11 rounded-full"
                  aria-label="منو"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
                <div className="flex flex-col gap-2 p-6 pt-8">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                    <div className="relative w-11 h-11 shrink-0">
                      <Image
                        src="/images/logo.png"
                        alt="لوگوی سرزمین عسل"
                        fill
                        sizes="44px"
                        className="object-contain"
                      />
                    </div>
                    <span className="font-extrabold text-lg text-honey-dark">
                      سرزمین عسل
                    </span>
                  </div>
                  {NAV_ITEMS.map((item) => (
                    <Button
                      key={item.key}
                      variant={view === item.key ? "default" : "ghost"}
                      onClick={() => go(item.key)}
                      className={cn(
                        "justify-start text-base py-3 h-auto",
                        view === item.key
                          ? "bg-honey-gradient text-primary-foreground"
                          : ""
                      )}
                    >
                      {item.label}
                    </Button>
                  ))}
                  <div className="my-3 border-t" />
                  <Link
                    href="/agent"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-accent text-sm font-medium text-honey-dark"
                  >
                    <UserCircle className="w-4 h-4" />
                    پنل نماینده
                  </Link>
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-accent text-sm font-medium text-honey-dark"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    پنل مدیریت
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
