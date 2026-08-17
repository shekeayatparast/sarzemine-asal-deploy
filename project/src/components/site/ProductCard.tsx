"use client";

import { Product } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatToman, toPersianDigits } from "@/lib/format";
import { useNav } from "@/lib/store";
import { Plus } from "lucide-react";

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  const { navigate } = useNav();

  return (
    <Card className="group overflow-hidden p-0 border-border/60 hover:border-honey/50 hover:shadow-xl transition-all duration-300 bg-card flex flex-col">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-cream-gradient">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-extrabold text-xl text-honey-dark mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-border/50">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                قیمت هر کیلو
              </div>
              <div className="font-extrabold text-lg text-honey-dark">
                {formatToman(product.pricePerKg)}
              </div>
            </div>
            <Button
              onClick={() => onAdd(product)}
              className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md shrink-0"
              size="lg"
            >
              <Plus className="w-4 h-4 ml-1" />
              افزودن
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
