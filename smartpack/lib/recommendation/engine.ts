/**
 * Rule-based packing recommendation engine.
 * Ranks catalog items using trip context (days, activities, weather) and optional user prefs.
 * No ML — score = tag match + essentials + base priority + packing/luggage rules.
 */

import type { CatalogItem, RankedItem, TripContext, UserPreferences } from "./types";

/** Weights for each scoring factor (tune for balance). */
const WEIGHTS = {
  essential: 1.0,
  tagMatch: 0.35,
  basePriority: 0.25,
  packingPenalty: 0.2,
  carryOnPenalty: 0.15,
} as const;

/**
 * Computes suggested quantity for an item given trip context.
 */
function suggestedQuantity(
  item: CatalogItem,
  tripLengthDays: number,
  weatherTags: string[]
): number {
  const rule = item.defaultQuantityRule;
  const hasRain = weatherTags.includes("rain") || weatherTags.includes("rainy");
  const hasCold = weatherTags.some((t) => ["cold", "snow", "windy"].includes(t));

  switch (rule) {
    case "one":
      return 1;
    case "trip_days":
      return Math.min(tripLengthDays, 7);
    case "trip_days_plus_one":
      return Math.min(tripLengthDays + 1, 8);
    case "if_rain":
      return hasRain ? 1 : 0;
    case "if_cold":
      return hasCold ? 1 : 0;
    case "if_international":
      return 1;
    default:
      return 1;
  }
}

/**
 * Builds a short human-readable reason for the recommendation.
 */
function buildReason(
  item: CatalogItem,
  tagMatch: boolean,
  matchedTags: string[],
  tier: RankedItem["tier"]
): string {
  if (item.isEssential) return "Essential for every trip.";
  if (tagMatch && matchedTags.length > 0) {
    const labels = matchedTags.slice(0, 2).join(", ");
    return `Matches your trip: ${labels}.`;
  }
  if (tier === "suggested") return "Commonly needed for this trip length.";
  return "Optional; pack if you have space.";
}

/**
 * Ranks all catalog items for the given trip context.
 * Returns a sorted list with score, reason, quantity, and tier.
 */
export function getPackingRecommendations(
  tripContext: TripContext,
  catalog: CatalogItem[],
  userPrefs?: UserPreferences | null
): RankedItem[] {
  const {
    tripLengthDays,
    activities,
    weatherTags,
    luggageType,
    laundryAccess,
    packingPreference,
    tempPreference = "neutral",
  } = tripContext;

  const contextTags = new Set([...activities, ...weatherTags]);
  const packLight = packingPreference < 0.5;
  const carryOnOnly = luggageType === "carry-on";
  const hasLaundry = laundryAccess === "available" || laundryAccess === "limited";

  const ranked: RankedItem[] = catalog.map((item) => {
    // Tag match: item tags vs weather + activities
    const matchedTags = item.tags.filter((t) => contextTags.has(t));
    const tagMatchCount = matchedTags.length;
    const tagMatchScore = Math.min(tagMatchCount * 0.5, 1);

    // Temp preference: boost cold items if runs_cold, hot items if runs_warm
    let tempBoost = 0;
    if (tempPreference === "runs_cold" && item.tags.some((t) => ["cold", "windy", "snow"].includes(t))) {
      tempBoost = 0.15;
    }
    if (tempPreference === "runs_warm" && item.tags.some((t) => ["hot", "sun", "beach"].includes(t))) {
      tempBoost = 0.15;
    }

    // Base score from importance and tag match
    let score =
      (item.isEssential ? WEIGHTS.essential : 0) +
      WEIGHTS.tagMatch * tagMatchScore +
      WEIGHTS.basePriority * item.basePriority +
      tempBoost;

    // Pack light: reduce score for non-essential, low-tag-match items
    if (packLight && !item.isEssential && tagMatchCount === 0) {
      score -= WEIGHTS.packingPenalty;
    }

    // Carry-on: slight penalty only for items that don't match the trip (avoid over-penalizing relevant items)
    if (carryOnOnly && !item.isEssential && item.basePriority < 0.6 && tagMatchCount === 0) {
      score -= WEIGHTS.carryOnPenalty;
    }

    // Laundry: no quantity boost needed for clothing (handled in quantity); small score tweak optional
    score = Math.max(0, Math.min(1, score));

    // Quantity (laundry reduces clothing counts)
    let qty = suggestedQuantity(item, tripLengthDays, weatherTags);
    const clothingCategories = ["clothing"];
    if (hasLaundry && clothingCategories.includes(item.category) && qty > 2) {
      qty = Math.max(2, Math.ceil(qty / 2));
    }

    // Skip items with quantity 0 (e.g. umbrella when no rain)
    if (qty === 0) {
      score = 0;
    }

    const tier: RankedItem["tier"] =
      item.isEssential || score >= 0.75 ? "essential" : score >= 0.32 ? "suggested" : "optional";

    const reason = buildReason(item, tagMatchCount > 0, matchedTags, tier);

    return {
      item,
      score,
      reason,
      suggestedQuantity: qty,
      tier,
    };
  });

  // Sort by score descending, then by basePriority, then by name
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.item.basePriority !== a.item.basePriority) return b.item.basePriority - a.item.basePriority;
    return a.item.name.localeCompare(b.item.name);
  });

  // Filter out zero-quantity items (e.g. umbrella when no rain)
  return ranked.filter((r) => r.suggestedQuantity > 0);
}
