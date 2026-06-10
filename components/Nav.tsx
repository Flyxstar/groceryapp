"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAppState } from "@/lib/app-state";

const LINKS = [
  { href: "/", label: "Hem", emoji: "🏠" },
  { href: "/catalogues", label: "Reklamblad", emoji: "📰" },
  { href: "/recipes", label: "Recept", emoji: "🍳" },
  { href: "/cart", label: "Inköpslista", emoji: "🛒" },
  { href: "/trip", label: "Planera resan", emoji: "🗺️" },
];

export default function Nav() {
  const path = usePathname();
  const { cart, hydrated } = useAppState();
  const count = cart.reduce((a, l) => a + l.qty, 0);
  const navRef = useRef<HTMLElement>(null);

  // Dynamic blur (spec A5): scroll offset 0–240px drives --scroll 0..1,
  // which the .glass-nav CSS maps to blur radius and saturation.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = Math.min(window.scrollY / 240, 1);
        navRef.current?.style.setProperty("--scroll", x.toFixed(3));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <nav ref={navRef} className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-5 py-2 sm:px-8">
        <span className="mr-3 whitespace-nowrap text-lg font-black tracking-tight text-rose-600">
          ✏️ Veckans Klipp
        </span>
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              id={l.href === "/cart" ? "nav-cart" : undefined}
              className={`pressable relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {l.emoji} {l.label}
              {l.href === "/cart" && hydrated && count > 0 && (
                <span
                  key={count}
                  className="badge-bump absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-md"
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
