export const APP_NAME = "Mon Frigo";
export const APP_VERSION = "1.0.0";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const OPENFOODFACTS_BASE_URL = "https://world.openfoodfacts.org/api/v0/product";

export const URGENCY_DAYS = {
  RED: 1,
  ORANGE: 3,
  YELLOW: 7,
};

export const FRIDGE_ICONS = ["❄️", "🧀", "🥩", "🥦", "🍎", "🥕", "🐟", "🥛", "🍺", "🧊"];
export const FRIDGE_COLORS = [
  "#1E3A5F",
  "#0F766E",
  "#7C3AED",
  "#B45309",
  "#059669",
  "#DC2626",
  "#0284C7",
  "#9333EA",
  "#065F46",
  "#991B1B",
];

export const NOTIFICATION_DELAY_OPTIONS = [1, 2, 3, 5, 7];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
