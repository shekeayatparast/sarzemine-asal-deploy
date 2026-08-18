"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Cart for the agent "place new order" page.
// Persists to localStorage so a page refresh doesn't lose state,
// but cleared on submit (see clear() below).

export interface AgentCartItem {
  id: string; // unique line id
  productId: string;
  productName: string;
  productImage: string | null;
  pricePerKg: number;
  containerSize: number;
  containerLabel: string;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number; // price per container in toman
}

interface AgentCartState {
  items: AgentCartItem[];
  addItem: (item: Omit<AgentCartItem, "id">) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  totalCount: () => number;
  totalKg: () => number;
  totalAmount: () => number;
}

const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useAgentCart = create<AgentCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        // merge identical lines (same product + size + wax)
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
      updateQuantity: (id, qty) =>
        set({
          items: get()
            .items.map((i) =>
              i.id === id ? { ...i, quantity: Math.max(1, qty) } : i
            )
            .filter((i) => i.quantity > 0),
        }),
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalKg: () =>
        get().items.reduce((s, i) => s + i.containerSize * i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }),
    { name: "agent-cart" }
  )
);
