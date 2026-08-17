"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== Navigation Store =====
export type ViewName =
  | "home"
  | "products"
  | "about"
  | "benefits"
  | "cart"
  | "contact"
  | "track";

interface NavState {
  view: ViewName;
  selectedSlug: string | null;
  navigate: (view: ViewName, slug?: string | null) => void;
}

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      view: "home",
      selectedSlug: null,
      navigate: (view, slug = null) => set({ view, selectedSlug: slug }),
    }),
    { name: "honey-nav" }
  )
);

// ===== Cart Store =====
export interface CartItem {
  id: string; // unique line id
  productId: string;
  productName: string;
  productSlug: string;
  pricePerKg: number;
  containerSize: number;
  containerLabel: string;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number; // price per container in toman
  image: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  totalCount: () => number;
  totalKg: () => number;
  totalAmount: () => number;
  // bonus honey (0.5kg per 5kg non-wholesale)
  bonusKg: () => number;
}

const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        // merge identical lines
        const items = [...get().items];
        const idx = items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.containerSize === item.containerSize &&
            i.hasWax === item.hasWax
        );
        if (idx >= 0) {
          items[idx] = {
            ...items[idx],
            quantity: items[idx].quantity + item.quantity,
          };
        } else {
          items.push({ ...item, id: genId() });
        }
        set({ items });
      },
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      updateQuantity: (id, qty) =>
        set({
          items: get()
            .items.map((i) =>
              i.id === id ? { ...i, quantity: Math.max(1, qty) } : i
            )
            .filter((i) => i.quantity > 0),
        }),
      clearCart: () => set({ items: [] }),
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalKg: () =>
        get().items.reduce(
          (s, i) => s + i.containerSize * i.quantity,
          0
        ),
      totalAmount: () =>
        get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      bonusKg: () => {
        const nonWholesaleKg = get()
          .items.filter((i) => !i.isWholesale)
          .reduce((s, i) => s + i.containerSize * i.quantity, 0);
        // every 5kg → 0.5kg free
        return Math.floor(nonWholesaleKg / 5) * 0.5;
      },
    }),
    { name: "honey-cart" }
  )
);
