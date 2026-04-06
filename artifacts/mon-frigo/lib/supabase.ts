import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Fridge = {
  id: string;
  name: string;
  color: string;
  icon: string;
  owner_id: string;
  created_at: string;
};

export type FridgeMember = {
  id: string;
  fridge_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
  users?: { email: string };
};

export type FridgeInvitation = {
  id: string;
  fridge_id: string;
  invited_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  token: string;
  created_at: string;
  fridges?: { name: string; color: string; icon: string };
  inviter?: { email: string };
};

export type ScanSession = {
  id: string;
  fridge_id: string;
  user_id: string;
  created_at: string;
  fridges?: { name: string };
  item_count?: number;
};

export type ScannedItem = {
  id: string;
  session_id: string;
  fridge_id: string;
  barcode?: string;
  product_name?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  dlc_photo_url?: string;
  expiry_date?: string;
  purchase_date?: string;
  quantity: number;
  consumed: boolean;
  consumed_at?: string;
  consumed_by?: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  notification_time: string;
  notification_days: number[];
  notification_methods: string[];
  notification_delay_days: number;
  language?: string;
  created_at: string;
};
