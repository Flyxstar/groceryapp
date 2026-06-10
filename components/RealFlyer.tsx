"use client";

import { useRef, useState } from "react";
import type { RealFlyer, RealFlyerOffer } from "@/lib/integrations/tjek";
import { formatSEK } from "@/lib/pricing";
import { CatalogueItem, Chain } from "@/lib/types";

type Pt = { x: number; y: number };

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

function bbox(polygon: [number, number][]) {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

/** Split "DAHLBERGS Fläskfärs" into brand + name. */
function splitHeading(heading: string): { brand: string; name: string } {
  const words = heading.trim().split(/\s+/);
  const brandWords: string[] = [];
  while (words.length > 1 && /^[A-ZÅÄÖ0-9&.:-]{2,}$/.test(words[0])) {
    brandWords.push(words.shift()!);
  }
  const brand = brandWords.join(" ");
  const name = words.join(" ") || brand;
  return { brand: brand === name ? "" : brand, name };
}

/** Build a cart item from a real flyer offer. The image is cropped later. */
export function offerToItem(offer: RealFlyerOffer, chain: Chain): CatalogueItem {
  const { brand, name } = splitHeading(offer.heading);
  return {
    id: `${chain}-tjek-${offer.offerId}`,
    chain,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    brand: brand ? brand.charAt(0) + brand.slice(1).toLowerCase() : "",
    price: offer.price,
    ordinaryPrice: Math.max(offer.prePrice ?? offer.price, offer.price),
    unit: offer.amount ?? "st",
    comparePrice: offer.comparePrice,
    emoji: "🛒",
    category: "skafferi",
    tags: offer.heading.toLowerCase().split(/[^a-zåäöé]+/).filter((w) => w.length > 2),
    memberOffer: false,
  };
}

/** Crop the offer's region out of the page image -> small data-URL thumbnail. */
export function cropOffer(
  img: HTMLImageElement | null,
  polygon: [number, number][]
): string | undefined {
  if (!img || !img.complete || !img.naturalWidth) return undefined;
  try {
    const b = bbox(polygon);
    const sx = b.x * img.naturalWidth;
    const sy = b.y * img.naturalHeight;
    const sw = Math.max(b.w * img.naturalWidth, 1);
    const sh = Math.max(b.h * img.naturalHeight, 1);
    const scale = Math.min(220 / sw, 220 / sh, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return undefined; // tainted canvas or similar – emoji fallback kicks in
  }
}

export default function RealFlyerView({
  flyer,
  drawMode,
  circles,
  qtyById,
  onCircleDrawn,
  onToggleOffer,
}: {
  flyer: RealFlyer;
  drawMode: boolean;
  circles: Record<string, { points: Pt[] }[]>;
  qtyById: Map<string, number>;
  onCircleDrawn: (
    pageId: string,
    pts: Pt[],
    hits: { offer: RealFlyerOffer; image?: string; rect: DOMRect | null }[]
  ) => void;
  onToggleOffer: (offer: RealFlyerOffer, image: string | undefined, rect: DOMRect | null) => void;
}) {
  return (
    <div className="space-y-8">
      {flyer.pages.map((page, i) => (
        <RealFlyerPage
          key={i}
          flyer={flyer}
          pageNumber={i + 1}
          imageUrl={page.view}
          drawMode={drawMode}
          savedCircles={circles[`tjek-${flyer.catalogId}-${i + 1}`] ?? []}
          qtyById={qtyById}
          onCircleDrawn={onCircleDrawn}
          onToggleOffer={onToggleOffer}
        />
      ))}
    </div>
  );
}

function RealFlyerPage({
  flyer,
  pageNumber,
  imageUrl,
  drawMode,
  savedCircles,
  qtyById,
  onCircleDrawn,
  onToggleOffer,
}: {
  flyer: RealFlyer;
  pageNumber: number;
  imageUrl: string;
  drawMode: boolean;
  savedCircles: { points: Pt[] }[];
  qtyById: Map<string, number>;
  onCircleDrawn: (
    pageId: string,
    pts: Pt[],
    hits: { offer: RealFlyerOffer; image?: string; rect: DOMRect | null }[]
  ) => void;
  onToggleOffer: (offer: RealFlyerOffer, image: string | undefined, rect: DOMRect | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const strokeRef = useRef<Pt[]>([]);
  const [stroke, setStroke] = useState<Pt[]>([]);
  const drawing = useRef(false);
  const pageId = `tjek-${flyer.catalogId}-${pageNumber}`;
  const offers = flyer.offers.filter((o) => o.page === pageNumber);

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
    if (pts.length > 6 && pathLength(pts) > 14) {
      const hits = offers
        .filter((o) => {
          const b = bbox(o.polygon);
          return inPolygon({ x: (b.x + b.w / 2) * 100, y: (b.y + b.h / 2) * 100 }, pts);
        })
        .map((offer) => {
          const b = bbox(offer.polygon);
          const pageRect = ref.current?.getBoundingClientRect();
          const rect = pageRect
            ? new DOMRect(
                pageRect.left + b.x * pageRect.width,
                pageRect.top + b.y * pageRect.height,
                b.w * pageRect.width,
                b.h * pageRect.height
              )
            : null;
          return { offer, image: cropOffer(imgRef.current, offer.polygon), rect };
        });
      onCircleDrawn(pageId, pts, hits);
    }
  };

  const toPath = (pts: Pt[]) =>
    pts.length ? "M " + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ") : "";
  const scaleY = (pts: Pt[]) => pts.map((p) => ({ x: p.x, y: p.y * 1.4 }));

  return (
    <div
      ref={ref}
      className="paper relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-xl border border-stone-300 shadow-md"
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
      {/* the original flyer page */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={`${flyer.name} sida ${pageNumber}`}
        crossOrigin="anonymous"
        loading={pageNumber <= 2 ? "eager" : "lazy"}
        draggable={false}
        className="block w-full"
      />
      <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
        sida {pageNumber}/{flyer.pageCount}
      </span>

      {/* tappable offer hotspots (active when circling is off) */}
      {offers.map((o) => {
        const b = bbox(o.polygon);
        const itemId = `${flyer.chain}-tjek-${o.offerId}`;
        const qty = qtyById.get(itemId) ?? 0;
        return (
          <button
            key={o.id}
            aria-label={`${o.heading} ${formatSEK(o.price)}`}
            title={`${o.heading} · ${formatSEK(o.price)}`}
            onPointerDown={(e) => {
              if (!drawMode) e.stopPropagation();
            }}
            onClick={(e) => {
              if (drawMode) return;
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onToggleOffer(o, cropOffer(imgRef.current, o.polygon), rect);
            }}
            className={`group absolute rounded-lg transition ${
              drawMode ? "pointer-events-none" : "cursor-pointer hover:bg-rose-500/10 hover:ring-2 hover:ring-rose-500/70"
            } ${qty > 0 ? "bg-green-500/10 ring-2 ring-green-600/80" : ""}`}
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
            }}
          >
            {qty > 0 && (
              <span className="check-pop absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white shadow-md">
                {qty > 1 ? qty : "✓"}
              </span>
            )}
          </button>
        );
      })}

      {/* marker circles */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 140"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`marker-rough-${pageId}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
        {savedCircles.map((c, i) => (
          <path
            key={i}
            className="marker-stroke"
            style={{ filter: `url(#marker-rough-${pageId})` }}
            d={toPath(scaleY(c.points)) + " Z"}
          />
        ))}
        {stroke.length > 1 && (
          <path
            className="marker-stroke"
            style={{ filter: `url(#marker-rough-${pageId})` }}
            d={toPath(scaleY(stroke))}
          />
        )}
      </svg>
    </div>
  );
}
