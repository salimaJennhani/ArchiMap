export type LatLng = { lat: number; lng: number };

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

export function parseLatLng(lat: unknown, lng: unknown): LatLng | null {
  const latNum = toNumber(lat);
  const lngNum = toNumber(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum < -90 || latNum > 90) return null;
  if (lngNum < -180 || lngNum > 180) return null;
  return { lat: latNum, lng: lngNum };
}

