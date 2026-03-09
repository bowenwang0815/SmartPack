/**
 * SmartPack recommendation engine using public API.
 * Use this entry point from the app or API routes.
 */

export { getPackingRecommendations } from "./engine";
export { MOCK_ITEM_CATALOG, MOCK_TRIP_CONTEXT, MOCK_TRIP_CONTEXT_COLD } from "./mockData";
export type {
  CatalogItem,
  RankedItem,
  TripContext,
  UserPreferences,
} from "./types";
