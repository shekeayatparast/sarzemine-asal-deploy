"use client";

import { useState, useEffect } from "react";
import { Product } from "@prisma/client";
import { ProductCard } from "./ProductCard";
import { AddToCartDialog } from "./AddToCartDialog";
import { Button } from "@/components/ui/button";
import { useNav } from "@/lib/store";
import { Loader2, Sparkles } from "lucide-react";

export function ProductsView() {
  const { navigate } = useNav();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Use cache: 'no-store' so the admin's price/description/featured edits
    // (made via the Telegram bot) are always reflected on the site.
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onAdd = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <div className="bg-cream-gradient min-h-[60vh]">
      {/* Page header */}
      <section className="bg-honey-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow">
            محصولات سرزمین عسل
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            عسل طبیعی و خالص، برداشت‌شده از طبیعت بکر ایران. هر نوع عسل با
            خواص منحصربه‌فرد خود، در ظروف متنوع برای شما.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Products grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-honey animate-spin" />
            <p className="text-muted-foreground">در حال بارگذاری محصولات...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-6 md:p-8 rounded-2xl bg-honey-light/20 border border-honey/20">
            <Sparkles className="w-8 h-8 text-honey-dark" />
            <p className="text-base md:text-lg font-bold text-honey-dark max-w-md">
              سوالی درباره محصولات دارید؟ خواص عسل‌ها را بررسی کنید یا با ما
              تماس بگیرید.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => navigate("benefits")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                خواص عسل
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("contact")}
              >
                تماس با ما
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AddToCartDialog
        product={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
