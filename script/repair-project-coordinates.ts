import "dotenv/config";
import { db } from "../server/db";
import { projects } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeAddress(address: string): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": process.env.NOMINATIM_USER_AGENT || "Asset-Manager/1.0",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  return data[0] ?? null;
}

function toNum(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

async function main() {
  const dryRun = String(process.env.DRY_RUN || "1") !== "0";
  const minMoveKm = Number(process.env.MIN_MOVE_KM || "1");
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;
  const userId = process.env.USER_ID || undefined;

  const rows = await db
    .select()
    .from(projects)
    .where(userId ? eq(projects.userId, userId) : isNotNull(projects.address));

  const candidates = rows.filter((p) => typeof p.address === "string" && p.address.trim().length > 0);
  const slice = limit ? candidates.slice(0, limit) : candidates;

  console.log(
    JSON.stringify(
      {
        dryRun,
        minMoveKm,
        limit: limit ?? null,
        userId: userId ?? null,
        totalProjects: rows.length,
        candidates: candidates.length,
        processing: slice.length,
      },
      null,
      2,
    ),
  );

  let updated = 0;
  for (const p of slice) {
    const addr = String(p.address).trim();
    const oldLat = toNum(p.latitude as any);
    const oldLng = toNum(p.longitude as any);

    const geo = await geocodeAddress(addr);
    await sleep(1100); // be polite to Nominatim

    if (!geo) {
      console.log(`[skip] project ${p.id}: geocode failed`);
      continue;
    }

    const newLat = Number(geo.lat);
    const newLng = Number(geo.lon);
    if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) {
      console.log(`[skip] project ${p.id}: invalid geocode result`);
      continue;
    }

    if (Number.isFinite(oldLat) && Number.isFinite(oldLng)) {
      const km = distanceKm({ lat: oldLat, lng: oldLng }, { lat: newLat, lng: newLng });
      if (km < minMoveKm) {
        console.log(`[ok] project ${p.id}: within ${km.toFixed(2)}km (no change)`);
        continue;
      }
      console.log(`[fix] project ${p.id}: move ${km.toFixed(2)}km -> (${newLat}, ${newLng})`);
    } else {
      console.log(`[fix] project ${p.id}: set -> (${newLat}, ${newLng})`);
    }

    if (!dryRun) {
      await db.update(projects).set({ latitude: String(newLat), longitude: String(newLng) }).where(eq(projects.id, p.id));
    }
    updated++;
  }

  console.log(JSON.stringify({ updated, dryRun }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

