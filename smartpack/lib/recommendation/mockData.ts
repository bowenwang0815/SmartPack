/**
 * Mock data for the recommendation engine: item catalog and sample trip context.
 */

import type { CatalogItem, TripContext } from "./types";

/** Predefined packing item catalog with tags for rule-based ranking. */
export const MOCK_ITEM_CATALOG: CatalogItem[] = [
  // Essentials (documents / always useful)
  { id: "doc_id", name: "ID / passport", category: "documents", tags: ["international", "formal"], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "doc_boarding", name: "Boarding pass / e-tickets", category: "documents", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "doc_money", name: "Wallet / cash / cards", category: "documents", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "phone", name: "Phone + charger", category: "electronics", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "meds_basic", name: "Basic meds (pain, stomach)", category: "toiletries", tags: [], basePriority: 0.8, defaultQuantityRule: "one", isEssential: true },

  // Clothing — weather & activity
  { id: "tshirt", name: "T-shirt", category: "clothing", tags: ["hot", "casual", "beach"], basePriority: 0.7, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "longsleeve", name: "Long-sleeve shirt", category: "clothing", tags: ["cold", "formal", "business"], basePriority: 0.6, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "sweater", name: "Sweater / fleece", category: "clothing", tags: ["cold", "windy"], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "jacket", name: "Jacket / rain layer", category: "clothing", tags: ["cold", "rain", "windy"], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "shorts", name: "Shorts", category: "clothing", tags: ["hot", "beach", "casual"], basePriority: 0.5, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "pants", name: "Pants / jeans", category: "clothing", tags: ["cold", "formal", "business"], basePriority: 0.7, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "socks", name: "Socks", category: "clothing", tags: [], basePriority: 0.8, defaultQuantityRule: "trip_days_plus_one", isEssential: false },
  { id: "underwear", name: "Underwear", category: "clothing", tags: [], basePriority: 0.8, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "swimwear", name: "Swimwear", category: "clothing", tags: ["beach", "hot"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "sleepwear", name: "Sleepwear", category: "clothing", tags: [], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "hat", name: "Hat / cap", category: "clothing", tags: ["hot", "beach", "sun"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "scarf", name: "Scarf", category: "clothing", tags: ["cold", "windy"], basePriority: 0.3, defaultQuantityRule: "one", isEssential: false },

  // Weather-specific
  { id: "umbrella", name: "Umbrella", category: "misc", tags: ["rain"], basePriority: 0.5, defaultQuantityRule: "if_rain", isEssential: false },
  { id: "rain_jacket", name: "Rain jacket", category: "clothing", tags: ["rain", "windy"], basePriority: 0.6, defaultQuantityRule: "if_rain", isEssential: false },
  { id: "sunscreen", name: "Sunscreen", category: "toiletries", tags: ["hot", "beach", "sun"], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "gloves", name: "Gloves", category: "clothing", tags: ["cold", "snow"], basePriority: 0.4, defaultQuantityRule: "if_cold", isEssential: false },

  // Activity-specific
  { id: "hiking_shoes", name: "Hiking shoes", category: "clothing", tags: ["hiking"], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },
  { id: "sandals", name: "Sandals / flip-flops", category: "clothing", tags: ["beach", "hot", "casual"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "formal_shoes", name: "Formal shoes", category: "clothing", tags: ["formal", "business", "nightlife"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "daypack", name: "Daypack / small bag", category: "misc", tags: ["hiking", "beach"], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },

  // Toiletries & misc
  { id: "toothbrush", name: "Toothbrush + toothpaste", category: "toiletries", tags: [], basePriority: 0.9, defaultQuantityRule: "one", isEssential: false },
  { id: "deodorant", name: "Deodorant", category: "toiletries", tags: [], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "adapter", name: "Power adapter", category: "electronics", tags: ["international"], basePriority: 0.5, defaultQuantityRule: "if_international", isEssential: false },
  { id: "headphones", name: "Headphones", category: "electronics", tags: [], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },
];

/** Sample trip context (e.g. 5-day beach + light hiking, warm, carry-on). */
export const MOCK_TRIP_CONTEXT: TripContext = {
  tripLengthDays: 5,
  activities: ["beach", "hiking"],
  weatherTags: ["hot", "sun"],
  luggageType: "carry-on",
  laundryAccess: "none",
  packingPreference: 0.5,
  tempPreference: "neutral",
};

/** Cold/rainy city trip for testing weather logic. */
export const MOCK_TRIP_CONTEXT_COLD: TripContext = {
  tripLengthDays: 3,
  activities: ["business"],
  weatherTags: ["cold", "rain", "windy"],
  luggageType: "checked",
  laundryAccess: "available",
  packingPreference: 0.7,
  tempPreference: "runs_cold",
};
