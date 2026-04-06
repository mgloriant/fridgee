import React, { createContext, useCallback, useContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, ScannedItem, ScanSession } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useFridge } from "./FridgeContext";

const ACTIVE_SESSION_KEY = "@monfrigo_active_session";

type PendingItem = {
  barcode?: string;
  product_name?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  expiry_date?: string;
  purchase_date?: string;
  quantity: number;
};

type ScanContextType = {
  activeSession: ScanSession | null;
  sessionItems: ScannedItem[];
  pendingItem: PendingItem | null;
  startSession: () => Promise<string | null>;
  endSession: () => Promise<void>;
  setPendingItem: (item: PendingItem | null) => void;
  saveItem: (item: PendingItem) => Promise<void>;
  refreshSessionItems: () => Promise<void>;
};

const ScanContext = createContext<ScanContextType>({
  activeSession: null,
  sessionItems: [],
  pendingItem: null,
  startSession: async () => null,
  endSession: async () => {},
  setPendingItem: () => {},
  saveItem: async () => {},
  refreshSessionItems: async () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeFridge } = useFridge();
  const [activeSession, setActiveSession] = useState<ScanSession | null>(null);
  const [sessionItems, setSessionItems] = useState<ScannedItem[]>([]);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);

  const startSession = useCallback(async () => {
    if (!user || !activeFridge) return null;
    const { data, error } = await supabase
      .from("scan_sessions")
      .insert({ fridge_id: activeFridge.id, user_id: user.id })
      .select()
      .single();
    if (error || !data) return null;
    setActiveSession(data);
    setSessionItems([]);
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, data.id);
    return data.id;
  }, [user, activeFridge]);

  const endSession = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    setActiveSession(null);
    setSessionItems([]);
    setPendingItem(null);
  }, []);

  const refreshSessionItems = useCallback(async () => {
    if (!activeSession) return;
    const { data } = await supabase
      .from("scanned_items")
      .select("*")
      .eq("session_id", activeSession.id)
      .order("created_at");
    if (data) setSessionItems(data);
  }, [activeSession]);

  const saveItem = useCallback(async (item: PendingItem) => {
    if (!activeSession || !activeFridge || !user) return;
    await supabase.from("scanned_items").insert({
      ...item,
      session_id: activeSession.id,
      fridge_id: activeFridge.id,
      quantity: item.quantity || 1,
      consumed: false,
    });
    await refreshSessionItems();
  }, [activeSession, activeFridge, user, refreshSessionItems]);

  return (
    <ScanContext.Provider value={{
      activeSession, sessionItems, pendingItem,
      startSession, endSession, setPendingItem, saveItem, refreshSessionItems,
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export const useScan = () => useContext(ScanContext);
