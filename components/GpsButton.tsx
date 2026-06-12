"use client";

import { useState } from "react";
import { useAppState } from "@/lib/app-state";

/**
 * Sets the user's home position from the device GPS. Everything that depends
 * on the position reacts automatically: store sorting, nearest live store
 * (Willys/Hemköp re-fetch their offers), travel times and trip planning.
 */
export default function GpsButton({ className = "" }: { className?: string }) {
  const { setHome, homeLabel, hydrated } = useAppState();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const locate = () => {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHome({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "Min position");
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const active = hydrated && homeLabel === "Min position";
  return (
    <button
      onClick={locate}
      disabled={state === "loading"}
      className={`pressable rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-sky-600 bg-sky-50 text-sky-700"
          : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
      } ${className}`}
    >
      {state === "loading"
        ? "🛰️ Hämtar position…"
        : state === "error"
          ? "⚠️ Kunde inte hämta GPS – tillåt platsåtkomst"
          : active
            ? "📍 Använder din GPS-position"
            : "📍 Hitta närmaste butik med GPS"}
    </button>
  );
}
