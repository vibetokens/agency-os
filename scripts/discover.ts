/**
 * scripts/discover.ts
 *
 * Discovers ICP businesses via Google Maps Places API.
 *
 * Usage:
 *   npx tsx scripts/discover.ts --niche plumber --city "Cleveland, OH"
 *   npx tsx scripts/discover.ts --niche hvac --city "Columbus, OH" --limit 20
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

const { leads } = schema;

interface PlacesResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlacesSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
}

async function searchPlaces(
  query: string,
  city: string,
  apiKey: string
): Promise<PlacesSearchResult[]> {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: `${query} in ${city}` }),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Places API error: ${data.error?.message ?? res.statusText}`);
  }

  return (data.places ?? []).map((p: any) => ({
    place_id: p.id,
    name: p.displayName?.text ?? "",
    formatted_address: p.formattedAddress,
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
  }));
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlacesResult> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount",
      },
    }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Place Details API error: ${data.error?.message ?? res.statusText}`);
  }

  return {
    place_id: data.id,
    name: data.displayName?.text ?? "",
    formatted_address: data.formattedAddress,
    formatted_phone_number: data.nationalPhoneNumber,
    website: data.websiteUri,
    rating: data.rating,
    user_ratings_total: data.userRatingCount,
  };
}

function parseArgs(): { niche: string; city: string; limit: number } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const niche = get("--niche");
  const city = get("--city");
  const limit = parseInt(get("--limit") ?? "20", 10);

  if (!niche || !city) {
    console.error("Usage: npx tsx scripts/discover.ts --niche <niche> --city <city> [--limit <n>]");
    process.exit(1);
  }

  return { niche, city, limit };
}

async function main() {
  const { niche, city, limit } = parseArgs();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("GOOGLE_MAPS_API_KEY not set in .env.local");
    process.exit(1);
  }

  console.log(`\nSearching for ${niche} businesses in ${city}...`);

  const results = await searchPlaces(niche, city, apiKey);
  const slice = results.slice(0, limit);

  console.log(`Found ${results.length} results. Processing top ${slice.length}...\n`);

  let newCount = 0;
  let skipCount = 0;

  for (const result of slice) {
    // Skip if already in DB
    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.placeId, result.place_id))
      .limit(1);

    if (existing.length > 0) {
      skipCount++;
      process.stdout.write("·");
      continue;
    }

    // Fetch full details (phone + website)
    let details: PlacesResult;
    try {
      details = await getPlaceDetails(result.place_id, apiKey);
    } catch (err) {
      console.error(`\nFailed to get details for ${result.name}:`, err);
      continue;
    }

    await db.insert(leads).values({
      placeId: details.place_id,
      businessName: details.name,
      niche,
      city,
      phone: details.formatted_phone_number ?? null,
      website: details.website ?? null,
      address: details.formatted_address ?? null,
      rating: details.rating ?? null,
      reviewCount: details.user_ratings_total ?? null,
      status: "discovered",
    });

    newCount++;
    process.stdout.write("+");

    // Polite rate limiting — 10 req/s is the Places API limit
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\n\nDone. +${newCount} new leads, ${skipCount} already known.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
