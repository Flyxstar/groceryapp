import { LatLng } from "@/lib/types";

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Street-network distance is longer than the crow flies; 1.3 is a common
 * urban detour factor (what OSRM/TomTom would return for real routes).
 */
export function roadKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 1.3;
}

export const PRESET_HOMES: { label: string; pos: LatLng }[] = [
  { label: "Odenplan, Stockholm", pos: { lat: 59.3428, lng: 18.0497 } },
  { label: "Medborgarplatsen, Stockholm", pos: { lat: 59.3141, lng: 18.0730 } },
  { label: "Fridhemsplan, Stockholm", pos: { lat: 59.3326, lng: 18.0294 } },
  { label: "Gärdet, Stockholm", pos: { lat: 59.3445, lng: 18.0996 } },
];
