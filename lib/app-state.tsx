"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartLine, Chain, LatLng, TransportMode } from "@/lib/types";
import { PRESET_HOMES } from "@/lib/geo";

interface AppState {
  cart: CartLine[];
  addToCart: (itemId: string, source: CartLine["source"], recipeId?: string) => void;
  removeFromCart: (itemId: string) => void;
  setQty: (itemId: string, qty: number) => void;
  clearCart: () => void;

  home: LatLng;
  homeLabel: string;
  setHome: (pos: LatLng, label: string) => void;

  selectedChains: Chain[];
  toggleChain: (c: Chain) => void;

  mode: TransportMode;
  setMode: (m: TransportMode) => void;

  /** circles drawn on catalogue pages, keyed by page id */
  circles: Record<string, { points: { x: number; y: number }[] }[]>;
  addCircle: (pageId: string, points: { x: number; y: number }[]) => void;
  clearCircles: () => void;

  hydrated: boolean;
}

const Ctx = createContext<AppState | null>(null);

const ALL_CHAINS: Chain[] = ["lidl", "ica", "citygross", "willys", "hemkop", "coop"];

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [home, setHomeState] = useState<LatLng>(PRESET_HOMES[0].pos);
  const [homeLabel, setHomeLabel] = useState(PRESET_HOMES[0].label);
  const [selectedChains, setSelectedChains] = useState<Chain[]>(ALL_CHAINS);
  const [mode, setMode] = useState<TransportMode>("bike");
  const [circles, setCircles] = useState<AppState["circles"]>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("groceryapp-state-v1");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.cart) setCart(s.cart);
        if (s.home) setHomeState(s.home);
        if (s.homeLabel) setHomeLabel(s.homeLabel);
        if (s.selectedChains) setSelectedChains(s.selectedChains);
        if (s.mode) setMode(s.mode);
        if (s.circles) setCircles(s.circles);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "groceryapp-state-v1",
      JSON.stringify({ cart, home, homeLabel, selectedChains, mode, circles })
    );
  }, [cart, home, homeLabel, selectedChains, mode, circles, hydrated]);

  const value = useMemo<AppState>(
    () => ({
      cart,
      addToCart: (itemId, source, recipeId) =>
        setCart((prev) => {
          const existing = prev.find((l) => l.itemId === itemId);
          if (existing) {
            return prev.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + 1 } : l));
          }
          return [...prev, { itemId, qty: 1, source, recipeId }];
        }),
      removeFromCart: (itemId) => setCart((prev) => prev.filter((l) => l.itemId !== itemId)),
      setQty: (itemId, qty) =>
        setCart((prev) =>
          qty <= 0
            ? prev.filter((l) => l.itemId !== itemId)
            : prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l))
        ),
      clearCart: () => setCart([]),
      home,
      homeLabel,
      setHome: (pos, label) => {
        setHomeState(pos);
        setHomeLabel(label);
      },
      selectedChains,
      toggleChain: (c) =>
        setSelectedChains((prev) =>
          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
        ),
      mode,
      setMode,
      circles,
      addCircle: (pageId, points) =>
        setCircles((prev) => ({
          ...prev,
          [pageId]: [...(prev[pageId] ?? []), { points }],
        })),
      clearCircles: () => setCircles({}),
      hydrated,
    }),
    [cart, home, homeLabel, selectedChains, mode, circles, hydrated]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
