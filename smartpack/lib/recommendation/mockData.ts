/**
 * Mock data for the recommendation engine: item catalog and sample trip context.
 */

import type { CatalogItem, TripContext } from "./types";

/** Predefined packing item catalog with tags for rule-based ranking. */
export const MOCK_ITEM_CATALOG: CatalogItem[] = [
  // Essentials (always useful)
  { id: "doc_id", name: "ID / passport", category: "documents", tags: ["international", "formal"], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "doc_boarding", name: "Boarding pass / e-tickets", category: "documents", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "doc_money", name: "Wallet / cash / cards", category: "documents", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "phone", name: "Phone", category: "electronics", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "phone_charger", name: "Phone charger", category: "electronics", tags: [], basePriority: 1, defaultQuantityRule: "one", isEssential: true },
  { id: "meds_basic", name: "Basic meds (pain, stomach)", category: "health", tags: [], basePriority: 0.85, defaultQuantityRule: "one", isEssential: true },

  // Documents & travel admin
  { id: "doc_insurance", name: "Travel insurance info", category: "documents", tags: ["international"], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "doc_itinerary", name: "Trip itinerary / reservations", category: "documents", tags: [], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "doc_visa", name: "Visa / entry documents", category: "documents", tags: ["international"], basePriority: 0.85, defaultQuantityRule: "one", isEssential: false },
  { id: "doc_student_id", name: "Student ID (discounts)", category: "documents", tags: [], basePriority: 0.3, defaultQuantityRule: "one", isEssential: false },
  { id: "doc_emergency", name: "Emergency contacts (printed)", category: "documents", tags: [], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },

  // Bags & organization
  { id: "bag_daypack", name: "Daypack / small bag", category: "bags", tags: ["hiking", "beach", "casual"], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "bag_packable_tote", name: "Packable tote bag", category: "bags", tags: ["beach", "casual"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "bag_drybag", name: "Dry bag", category: "bags", tags: ["beach", "rain"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "bag_zip_pouches", name: "Zip pouches / organizers", category: "bags", tags: [], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },
  { id: "bag_laundry_bag", name: "Laundry bag", category: "bags", tags: [], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },

  // Core clothing basics
  { id: "tops_tshirt", name: "T-shirt", category: "clothing", tags: ["hot", "casual", "beach"], basePriority: 0.75, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "tops_longsleeve", name: "Long-sleeve shirt", category: "clothing", tags: ["cold", "casual", "business"], basePriority: 0.62, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "tops_buttondown", name: "Button-down shirt", category: "clothing", tags: ["business", "formal", "nightlife"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "tops_thermal", name: "Thermal base layer (top)", category: "clothing", tags: ["cold", "snow", "windy"], basePriority: 0.55, defaultQuantityRule: "if_cold", isEssential: false },
  { id: "bottoms_shorts", name: "Shorts", category: "clothing", tags: ["hot", "beach", "casual"], basePriority: 0.55, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "bottoms_pants", name: "Pants / jeans", category: "clothing", tags: ["cold", "casual", "business"], basePriority: 0.7, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "bottoms_leggings", name: "Leggings", category: "clothing", tags: ["cold", "casual"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "underwear", name: "Underwear", category: "clothing", tags: [], basePriority: 0.85, defaultQuantityRule: "trip_days", isEssential: false },
  { id: "socks", name: "Socks", category: "clothing", tags: ["cold"], basePriority: 0.85, defaultQuantityRule: "trip_days_plus_one", isEssential: false },
  { id: "sleepwear", name: "Sleepwear", category: "clothing", tags: [], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },

  // Outerwear & weather protection
  { id: "outer_sweater", name: "Sweater / fleece", category: "clothing", tags: ["cold", "windy"], basePriority: 0.65, defaultQuantityRule: "one", isEssential: false },
  { id: "outer_light_jacket", name: "Light jacket", category: "clothing", tags: ["windy", "cold"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "outer_rain_jacket", name: "Rain jacket", category: "clothing", tags: ["rain", "windy"], basePriority: 0.65, defaultQuantityRule: "if_rain", isEssential: false },
  { id: "outer_puffer", name: "Warm jacket / puffer", category: "clothing", tags: ["cold", "snow", "windy"], basePriority: 0.65, defaultQuantityRule: "if_cold", isEssential: false },
  { id: "umbrella", name: "Umbrella", category: "misc", tags: ["rain"], basePriority: 0.55, defaultQuantityRule: "if_rain", isEssential: false },

  // Accessories
  { id: "acc_hat_cap", name: "Hat / cap", category: "clothing", tags: ["hot", "beach", "sun"], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },
  { id: "acc_sunglasses", name: "Sunglasses", category: "accessories", tags: ["hot", "beach", "sun"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "acc_scarf", name: "Scarf", category: "clothing", tags: ["cold", "windy"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "acc_gloves", name: "Gloves", category: "clothing", tags: ["cold", "snow"], basePriority: 0.45, defaultQuantityRule: "if_cold", isEssential: false },
  { id: "acc_beanie", name: "Beanie", category: "clothing", tags: ["cold", "windy"], basePriority: 0.4, defaultQuantityRule: "if_cold", isEssential: false },

  // Shoes
  { id: "shoes_sneakers", name: "Comfortable walking shoes", category: "clothing", tags: ["casual"], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "shoes_hiking", name: "Hiking shoes", category: "clothing", tags: ["hiking"], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "shoes_sandals", name: "Sandals / flip-flops", category: "clothing", tags: ["beach", "hot", "casual"], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },
  { id: "shoes_formal", name: "Formal shoes", category: "clothing", tags: ["formal", "business", "nightlife"], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },
  { id: "shoes_snowboots", name: "Snow boots", category: "clothing", tags: ["snow", "cold"], basePriority: 0.55, defaultQuantityRule: "if_cold", isEssential: false },

  // Beach / sun
  { id: "beach_swimwear", name: "Swimwear", category: "clothing", tags: ["beach", "hot"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "beach_coverup", name: "Cover-up / rash guard", category: "clothing", tags: ["beach", "sun"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "beach_towel", name: "Quick-dry towel", category: "misc", tags: ["beach"], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },
  { id: "beach_sunscreen", name: "Sunscreen", category: "toiletries", tags: ["hot", "beach", "sun"], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "beach_after_sun", name: "After-sun / aloe", category: "toiletries", tags: ["hot", "beach", "sun"], basePriority: 0.3, defaultQuantityRule: "one", isEssential: false },

  // Hiking / outdoors
  { id: "hike_water_bottle", name: "Water bottle", category: "misc", tags: ["hiking", "hot"], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "hike_snacks", name: "Trail snacks", category: "misc", tags: ["hiking"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "hike_headlamp", name: "Headlamp / flashlight", category: "electronics", tags: ["hiking"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "hike_bug_spray", name: "Bug spray", category: "toiletries", tags: ["hiking", "beach"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "hike_first_aid", name: "Small first-aid kit", category: "health", tags: ["hiking"], basePriority: 0.5, defaultQuantityRule: "one", isEssential: false },

  // Toiletries (core)
  { id: "toiletry_toothbrush", name: "Toothbrush", category: "toiletries", tags: [], basePriority: 0.9, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_toothpaste", name: "Toothpaste", category: "toiletries", tags: [], basePriority: 0.85, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_deodorant", name: "Deodorant", category: "toiletries", tags: [], basePriority: 0.7, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_shampoo", name: "Shampoo / conditioner", category: "toiletries", tags: [], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_soap", name: "Body wash / soap", category: "toiletries", tags: [], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_razor", name: "Razor", category: "toiletries", tags: [], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_brush", name: "Hairbrush / comb", category: "toiletries", tags: [], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_skincare", name: "Skincare (face wash, moisturizer)", category: "toiletries", tags: ["cold", "windy"], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_lip_balm", name: "Lip balm", category: "toiletries", tags: ["cold", "windy"], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "toiletry_hand_sanitizer", name: "Hand sanitizer", category: "toiletries", tags: [], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },

  // Health & meds
  { id: "health_prescriptions", name: "Prescription meds", category: "health", tags: [], basePriority: 0.9, defaultQuantityRule: "one", isEssential: false },
  { id: "health_allergy", name: "Allergy meds", category: "health", tags: [], basePriority: 0.45, defaultQuantityRule: "one", isEssential: false },
  { id: "health_motion_sickness", name: "Motion sickness meds", category: "health", tags: [], basePriority: 0.4, defaultQuantityRule: "one", isEssential: false },
  { id: "health_bandages", name: "Band-aids", category: "health", tags: [], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "health_masks", name: "Masks", category: "health", tags: [], basePriority: 0.25, defaultQuantityRule: "one", isEssential: false },

  // Electronics & travel tech
  { id: "tech_power_bank", name: "Power bank", category: "electronics", tags: [], basePriority: 0.65, defaultQuantityRule: "one", isEssential: false },
  { id: "tech_cables", name: "Charging cables", category: "electronics", tags: [], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "tech_wall_charger", name: "Wall charger", category: "electronics", tags: [], basePriority: 0.6, defaultQuantityRule: "one", isEssential: false },
  { id: "tech_adapter", name: "Power adapter", category: "electronics", tags: ["international"], basePriority: 0.55, defaultQuantityRule: "if_international", isEssential: false },
  { id: "tech_headphones", name: "Headphones", category: "electronics", tags: [], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "tech_laptop", name: "Laptop", category: "electronics", tags: ["business"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "tech_laptop_charger", name: "Laptop charger", category: "electronics", tags: ["business"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },

  // Comfort & misc
  { id: "misc_reusable_bottle", name: "Reusable water bottle", category: "misc", tags: ["hot", "hiking"], basePriority: 0.55, defaultQuantityRule: "one", isEssential: false },
  { id: "misc_travel_pillow", name: "Travel pillow", category: "misc", tags: [], basePriority: 0.35, defaultQuantityRule: "one", isEssential: false },
  { id: "misc_eye_mask", name: "Sleep mask", category: "misc", tags: [], basePriority: 0.3, defaultQuantityRule: "one", isEssential: false },
  { id: "misc_earplugs", name: "Earplugs", category: "misc", tags: ["nightlife"], basePriority: 0.3, defaultQuantityRule: "one", isEssential: false },
  { id: "misc_pen", name: "Pen", category: "misc", tags: [], basePriority: 0.2, defaultQuantityRule: "one", isEssential: false },
  { id: "misc_book", name: "Book / Kindle", category: "misc", tags: [], basePriority: 0.25, defaultQuantityRule: "one", isEssential: false },
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
