"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { currentWeek, getCatalogue, hash01, layoutPages } from "@/lib/data/catalogue";
import { CHAINS, popularTimes, storeForChain } from "@/lib/data/stores";
import { haversineKm } from "@/lib/geo";
import type { LidlFlyer } from "@/lib/integrations/lidl";
import { formatSEK, getPriceHistory } from "@/lib/pricing";
import { CatalogueItem, CataloguePage, Chain, PlacedItem } from "@/lib/types";

const LIVE_CHAINS: Chain[] = ["willys", "hemkop"];
/** keep live flyers at a browsable size: 1 splash page + 7 grid pages */
const MAX_LIVE_ITEMS = 61;

type Pt = { x: number; y: number };

/** Ray-casting point-in-polygon, coordinates in page-percent space. */
function inPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/** Animate a small product thumbnail flying from a card into the nav cart. */
function flyToCart(from: DOMRect, imageUrl?: string, emoji?: string) {
  const cartEl = document.getElementById("nav-cart");
  if (!cartEl || typeof from.left !== "number") return;
  const to = cartEl.getBoundingClientRect();
  const el = document.createElement(imageUrl ? "img" : "div");
  if (imageUrl) {
    (el as HTMLImageElement).src = imageUrl;
  } else {
    el.textContent = emoji ?? "🛒";
    el.style.fontSize = "26px";
    el.style.lineHeight = "36px";
    el.style.textAlign = "center";
  }
  Object.assign(el.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - 22}px`,
    top: `${from.top + from.height / 2 - 22}px`,
    width: "44px",
    height: "44px",
    objectFit: "contain",
    zIndex: "100",
    pointerEvents: "none",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
    padding: "4px",
  });
  document.body.appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  el.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.9)`, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0.4 },
    ],
    { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
  ).onfinish = () => el.remove();
}

function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

interface Toast {
  id: number;
  text: string;
  images: { url?: string; emoji: string }[];
}

type LiveStatus =
  | { kind: "loading" }
  | { kind: "live"; storeName: string; validUntil?: string; count: number }
  | { kind: "sample"; reason: string };

export default function CatalogueViewer({ chain }: { chain: Chain }) {
  const info = CHAINS[chain];
  const sampleStore = storeForChain(chain);
  const {
    addToCart,
    removeFromCart,
    cart,
    circles,
    addCircle,
    home,
    registerLiveItems,
    registerLiveStore,
    hydrated,
  } = useAppState();
  const [drawMode, setDrawMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pages, setPages] = useState<CataloguePage[]>(() =>
    LIVE_CHAINS.includes(chain) ? [] : getCatalogue(chain)
  );
  const [status, setStatus] = useState<LiveStatus>(() =>
    LIVE_CHAINS.includes(chain)
      ? { kind: "loading" }
      : { kind: "sample", reason: "kedjan saknar öppet erbjudande-API (kräver nyckel)" }
  );
  const [storeLabel, setStoreLabel] = useState(`${sampleStore.name}, ${sampleStore.address}`);
  const [lidlFlyers, setLidlFlyers] = useState<LidlFlyer[]>([]);

  const qtyById = new Map(cart.map((l) => [l.itemId, l.qty]));

  // Live offers: find the user's nearest store, fetch its weekly offers,
  // typeset them as flyer pages and register the store for trip planning.
  useEffect(() => {
    if (!hydrated || !LIVE_CHAINS.includes(chain)) return;
    let cancelled = false;
    (async () => {
      try {
        const sres = await fetch(`/api/stores/${chain}`);
        if (!sres.ok) throw new Error("kunde inte hämta butiker");
        const { stores } = (await sres.json()) as {
          stores: { id: string; name: string; address: string; lat: number; lng: number }[];
        };
        const nearest = stores.reduce((a, b) =>
          haversineKm(home, a) <= haversineKm(home, b) ? a : b
        );
        const ores = await fetch(`/api/offers/${chain}?storeId=${nearest.id}`);
        if (!ores.ok) throw new Error("kunde inte hämta erbjudanden");
        const data = (await ores.json()) as { items: CatalogueItem[]; validUntil?: string };
        if (cancelled || !data.items?.length) return;
        setPages(layoutPages(chain, data.items.slice(0, MAX_LIVE_ITEMS)));
        setStoreLabel(`${nearest.name} – din närmaste butik (${nearest.address})`);
        setStatus({
          kind: "live",
          storeName: nearest.name,
          validUntil: data.validUntil,
          count: data.items.length,
        });
        registerLiveStore({
          id: `${chain}-live-${nearest.id}`,
          chain,
          name: nearest.name,
          address: nearest.address,
          lat: nearest.lat,
          lng: nearest.lng,
          opens: 7,
          closes: 22,
          popularTimes: popularTimes(7, 22, hash01(nearest.id) * 2 - 1),
        });
      } catch (err) {
        if (!cancelled) {
          setPages(getCatalogue(chain));
          setStatus({ kind: "sample", reason: String(err) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, hydrated, home.lat, home.lng]);

  // Lidl: list the real, currently valid flyers from lidl.se
  useEffect(() => {
    if (chain !== "lidl") return;
    fetch("/api/lidl-flyers")
      .then((r) => r.json())
      .then((d) => setLidlFlyers(d.flyers ?? []))
      .catch(() => {});
  }, [chain]);

  const toast = (text: string, images: Toast["images"] = []) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, images }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  };

  /** Single entry point for adding items – cart, live registry, fly animation, haptics. */
  const addItems = (items: CatalogueItem[], rects: (DOMRect | null)[]) => {
    if (status.kind === "live") registerLiveItems(items);
    items.forEach((item, i) => {
      addToCart(item.id, "catalogue");
      const rect = rects[i];
      if (rect) setTimeout(() => flyToCart(rect, item.image, item.emoji), i * 90);
    });
    vibrate();
    toast(
      items.length === 1 ? `${items[0].name} ligger i listan` : `${items.length} varor tillagda`,
      items.slice(0, 4).map((it) => ({ url: it.image, emoji: it.emoji }))
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            {info.name} · vecka {currentWeek()}
          </h1>
          <p className="text-sm text-stone-500">{storeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawMode((d) => !d)}
            className={`pressable rounded-full px-4 py-2 text-sm font-bold ${
              drawMode ? "bg-rose-600 text-white shadow-md" : "border border-stone-300 bg-white"
            }`}
          >
            {drawMode ? "✏️ Ringa in: PÅ" : "👆 Ringa in: AV (bläddra)"}
          </button>
          <Link
            href="/cart"
            className="pressable rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white"
          >
            🛒 Till listan
          </Link>
        </div>
      </div>
      <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        ✏️ <b>Ringa in som i leksakskatalogen</b> – eller tryck på{" "}
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-400 bg-white align-middle text-[11px] font-bold">
          +
        </span>{" "}
        på en vara för att bocka i den. Tryck igen för att ångra.
      </p>

      {status.kind === "loading" && (
        <p className="mb-6 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
          ⏳ Hämtar veckans riktiga erbjudanden från din närmaste {info.name}-butik…
        </p>
      )}
      {status.kind === "live" && (
        <p className="pop-in mb-6 rounded-xl bg-green-50 p-3 text-sm text-green-900">
          🟢 <b>Live från {info.name.toLowerCase()}.se:</b> {status.count} riktiga erbjudanden i{" "}
          {status.storeName}
          {status.validUntil ? `, gäller t.o.m. ${status.validUntil}` : ""}. Priser, bilder och
          medlemserbjudanden kommer direkt från butikens API.
        </p>
      )}
      {status.kind === "sample" && chain !== "lidl" && (
        <p className="mb-6 rounded-xl bg-stone-100 p-3 text-sm text-stone-600">
          ℹ️ Visar exempeldata – {status.reason}.
        </p>
      )}

      {chain === "lidl" && lidlFlyers.length > 0 && (
        <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold">🟢 Riktiga reklamblad från lidl.se</h2>
          <p className="mb-3 text-xs text-stone-500">
            Hämtas live från Lidls stabila översiktssida – veckobladen byts ut varje vecka men
            listan här hänger med automatiskt. Bladvisaren öppnas hos Lidl; exempelbladet nedan
            kan du ringa i som vanligt.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {lidlFlyers.map((f) => (
              <a
                key={f.url}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="pressable w-36 shrink-0 overflow-hidden rounded-xl border border-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {f.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.cover} alt={f.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-blue-900 text-3xl">📰</div>
                )}
                <div className="p-2">
                  <p className="truncate text-xs font-bold">{f.title}</p>
                  <p className="truncate text-[10px] text-stone-500">{f.validity}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {status.kind === "loading" && (
          <>
            <SkeletonPage />
            <SkeletonPage />
          </>
        )}
        {pages.map((page) => (
          <FlyerPage
            key={page.id}
            page={page}
            color={info.color}
            chainName={info.name}
            drawMode={drawMode}
            savedCircles={circles[page.id] ?? []}
            qtyById={qtyById}
            onToggleItem={(item, rect) => {
              if ((qtyById.get(item.id) ?? 0) > 0) {
                removeFromCart(item.id);
                vibrate(8);
                toast(`${item.name} borttagen`);
              } else {
                addItems([item], [rect]);
              }
            }}
            onCircle={(pts, hits, rects) => {
              addCircle(page.id, pts);
              if (hits.length === 0) {
                toast("Ingen vara i ringen – prova att ringa runt en ruta");
              } else {
                addItems(
                  hits.map((h) => h.item),
                  rects
                );
              }
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in flex max-w-md items-center gap-2 rounded-full bg-stone-900/90 py-2 pl-2.5 pr-5 text-center text-sm font-semibold text-white shadow-2xl backdrop-blur"
          >
            {t.images.length > 0 && (
              <span className="flex -space-x-2">
                {t.images.map((im, i) =>
                  im.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={im.url}
                      alt=""
                      className="h-7 w-7 rounded-full border border-stone-700 bg-white object-contain p-0.5"
                    />
                  ) : (
                    <span
                      key={i}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-700 bg-white text-sm"
                    >
                      {im.emoji}
                    </span>
                  )
                )}
              </span>
            )}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="flyer-page relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md">
      <div className="shimmer absolute inset-x-0 top-0 h-[9%]" />
      <div className="shimmer absolute left-[6%] top-[12%] h-[34%] w-[88%] rounded-lg" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="shimmer absolute h-[22%] w-[42%] rounded-lg"
          style={{ left: `${6 + (i % 2) * 46}%`, top: `${50 + Math.floor(i / 2) * 25}%` }}
        />
      ))}
    </div>
  );
}

function FlyerPage({
  page,
  color,
  chainName,
  drawMode,
  savedCircles,
  qtyById,
  onToggleItem,
  onCircle,
}: {
  page: CataloguePage;
  color: string;
  chainName: string;
  drawMode: boolean;
  savedCircles: { points: Pt[] }[];
  qtyById: Map<string, number>;
  onToggleItem: (item: CatalogueItem, rect: DOMRect | null) => void;
  onCircle: (pts: Pt[], hits: PlacedItem[], rects: (DOMRect | null)[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Points live in a ref and are mirrored to state only for rendering.
  // Side effects (onCircle -> addToCart) must never run inside a state
  // updater: React invokes updaters twice in StrictMode, which double-added
  // circled items.
  const strokeRef = useRef<Pt[]>([]);
  const [stroke, setStroke] = useState<Pt[]>([]);
  const drawing = useRef(false);

  const toPct = (e: React.PointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const pts = strokeRef.current;
    strokeRef.current = [];
    setStroke([]);
    if (pts.length > 6 && pathLength(pts) > 18) {
      const hits = page.items.filter((pi) =>
        inPolygon({ x: pi.x + pi.w / 2, y: pi.y + pi.h / 2 }, pts)
      );
      const rects = hits.map((h) => {
        const el = ref.current?.querySelector(`[data-item-id="${CSS.escape(h.item.id)}"]`);
        return el ? el.getBoundingClientRect() : null;
      });
      onCircle(pts, hits, rects);
    }
  };

  const toPath = (pts: Pt[]) =>
    pts.length ? "M " + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ") : "";

  return (
    <div
      ref={ref}
      className="flyer-page relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-xl border border-stone-300 bg-white shadow-md"
      style={{ touchAction: drawMode ? "none" : "auto" }}
      onPointerDown={(e) => {
        if (!drawMode) return;
        drawing.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        strokeRef.current = [toPct(e)];
        setStroke(strokeRef.current);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        strokeRef.current = [...strokeRef.current, toPct(e)];
        setStroke(strokeRef.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={finish}
    >
      {/* flyer header */}
      <div
        className="absolute inset-x-0 top-0 flex h-[9%] items-center justify-between px-4 text-white"
        style={{ background: color }}
      >
        <span className="text-lg font-black">{chainName}</span>
        <span className="text-sm font-semibold">
          {page.title} · sida {page.pageNumber}
        </span>
      </div>

      {/* offer cards */}
      {page.items.map((pi) => (
        <OfferCard
          key={pi.item.id}
          placed={pi}
          color={color}
          qty={qtyById.get(pi.item.id) ?? 0}
          onToggle={(rect) => onToggleItem(pi.item, rect)}
        />
      ))}

      {/* drawn circles overlay */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 133.33"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="marker-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
        {savedCircles.map((c, i) => (
          <path
            key={i}
            className="marker-stroke"
            d={toPath(c.points.map((p) => ({ x: p.x, y: (p.y * 133.33) / 100 }))) + " Z"}
          />
        ))}
        {stroke.length > 1 && (
          <path
            className="marker-stroke"
            d={toPath(stroke.map((p) => ({ x: p.x, y: (p.y * 133.33) / 100 })))}
          />
        )}
      </svg>
    </div>
  );
}

function OfferCard({
  placed,
  color,
  qty,
  onToggle,
}: {
  placed: PlacedItem;
  color: string;
  qty: number;
  onToggle: (rect: DOMRect | null) => void;
}) {
  const { item, x, y, w, h, splash } = placed;
  const cardRef = useRef<HTMLDivElement>(null);
  const hist = getPriceHistory(item);
  const discount = Math.round((1 - item.price / item.ordinaryPrice) * 100);
  const inCart = qty > 0;

  return (
    <div
      ref={cardRef}
      data-item-id={item.id}
      className={`offer-card absolute overflow-hidden rounded-lg border bg-stone-50 ${
        inCart ? "in-cart border-green-600" : "border-stone-200"
      }`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
    >
      {/* check / add button – stops propagation so it never starts a circle stroke */}
      <button
        aria-label={inCart ? `Ta bort ${item.name}` : `Lägg till ${item.name}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(cardRef.current?.getBoundingClientRect() ?? null);
        }}
        className={`pressable absolute left-1 top-1 z-10 flex items-center justify-center rounded-full border font-bold shadow-sm ${
          splash ? "h-9 w-9 text-base" : "h-6 w-6 text-xs sm:h-7 sm:w-7 sm:text-sm"
        } ${
          inCart
            ? "check-pop border-green-600 bg-green-600 text-white"
            : "border-stone-300 bg-white/95 text-stone-500 hover:border-stone-500 hover:text-stone-800"
        }`}
      >
        {inCart ? (qty > 1 ? qty : "✓") : "+"}
      </button>

      <div className="flex h-full">
        <div
          className={`flex items-center justify-center ${splash ? "w-1/3 text-7xl" : "w-1/3 text-4xl"}`}
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              draggable={false}
              className="max-h-[90%] max-w-[90%] object-contain"
            />
          ) : (
            item.emoji
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-1">
          <p className={`truncate font-bold leading-tight ${splash ? "text-xl" : "text-xs sm:text-sm"}`}>
            {item.name}
          </p>
          <p className="truncate text-[10px] text-stone-500 sm:text-xs">
            {item.brand}
            {item.isBudgetBrand ? " (lågpris)" : ""}
            {item.memberOffer ? " · medlemspris" : ""}
          </p>
          {splash && (
            <p className="mt-1 text-xs text-stone-500">
              För 1 mån sen: {formatSEK(hist.oneMonthAgo)} · för 6 mån: {formatSEK(hist.sixMonthsAgo)}
            </p>
          )}
          <p className="text-[10px] text-stone-400 sm:text-xs">
            ord. {formatSEK(item.ordinaryPrice)}
            {item.comparePrice ? ` · ${item.comparePrice}` : ""}
          </p>
        </div>
        <div
          className={`m-1 flex shrink-0 flex-col items-center justify-center self-center rounded-full text-white shadow ${
            splash ? "h-24 w-24" : "h-12 w-12 sm:h-14 sm:w-14"
          }`}
          style={{ background: color, rotate: "8deg" }}
        >
          <span className={`font-black leading-none ${splash ? "text-3xl" : "text-sm sm:text-base"}`}>
            {item.price.toLocaleString("sv-SE", { maximumFractionDigits: 2 })}
          </span>
          <span className={splash ? "text-sm" : "text-[8px] sm:text-[10px]"}>kr/{item.unit}</span>
          {discount >= 15 && (
            <span className={`font-bold ${splash ? "text-xs" : "text-[7px] sm:text-[9px]"}`}>
              –{discount}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
