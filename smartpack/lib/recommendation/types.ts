/**
 * Types for the SmartPack recommendation engine.
 * Aligns with project proposal: trip context, catalog, and ranked output.
 */

/** Trip context used to rank packing items (from survey + weather). */
export interface TripContext {
  tripLengthDays: number;
  activities: string[];
  weatherTags: string[];
  luggageType: "carry-on" | "checked";
  laundryAccess: "none" | "limited" | "available";
  /** 0 = pack light, 1 = pack prepared */
  packingPreference: number;
  /** Affects how much we boost cold-weather vs hot-weather items */
  tempPreference?: "runs_cold" | "neutral" | "runs_warm";
}

/** One item in the packing catalog (indexed for ranking). */
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  /** Default importance 0–1; used as baseline score. */
  basePriority: number;
  /** e.g. "trip_days", "trip_days_plus_one", "one", "if_rain" */
  defaultQuantityRule: string;
  isEssential: boolean;
}

/** User preferences (personal model); optional for MVP. */
export interface UserPreferences {
  packingStyle: number;
  tempPreference: "runs_cold" | "neutral" | "runs_warm";
  luggagePreference: "carry-on" | "checked" | "both";
}

/** One recommended item with score and explanation. */
export interface RankedItem {
  item: CatalogItem;
  score: number;
  reason: string;
  suggestedQuantity: number;
  tier: "essential" | "suggested" | "optional";
}
