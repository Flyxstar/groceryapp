import { CHAINS } from "@/lib/data/stores";
import { Chain } from "@/lib/types";

/**
 * Official chain logo on a small "paper" chip (stays white in dark mode so
 * the brand marks always sit on their intended background).
 * `labeled` controls alt text: keep it off when the store name is written
 * right next to the logo, so screen readers don't hear the name twice.
 */
export default function ChainLogo({
  chain,
  size = "md",
  labeled = false,
}: {
  chain: Chain;
  size?: "sm" | "md" | "lg";
  labeled?: boolean;
}) {
  const info = CHAINS[chain];
  const chip =
    size === "lg" ? "h-12 px-3 rounded-xl" : size === "sm" ? "h-6 px-1.5 rounded-md" : "h-8 px-2 rounded-lg";
  const img = size === "lg" ? "max-h-8" : size === "sm" ? "max-h-4" : "max-h-5";
  return (
    <span
      className={`paper inline-flex w-fit shrink-0 items-center justify-center shadow-sm ring-1 ring-stone-900/10 ${chip}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={info.logo}
        alt={labeled ? info.name : ""}
        aria-hidden={!labeled}
        className={`${img} w-auto object-contain`}
        draggable={false}
      />
    </span>
  );
}
