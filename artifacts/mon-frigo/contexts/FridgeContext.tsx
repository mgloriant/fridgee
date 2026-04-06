import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, Fridge, ScannedItem } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

const ACTIVE_FRIDGE_KEY = "@monfrigo_active_fridge";

type FridgeContextType = {
  fridges: Fridge[];
  activeFridge: Fridge | null;
  items: ScannedItem[];
  loading: boolean;
  setActiveFridge: (fridge: Fridge) => void;
  refreshFridges: () => Promise<void>;
  refreshItems: () => Promise<void>;
  markConsumed: (itemId: string, quantity: number) => Promise<void>;
  undoLastConsume: () => Promise<void>;
  lastConsumedItem: ScannedItem | null;
};

const FridgeContext = createContext<FridgeContextType>({
  fridges: [],
  activeFridge: null,
  items: [],
  loading: true,
  setActiveFridge: () => {},
  refreshFridges: async () => {},
  refreshItems: async () => {},
  markConsumed: async () => {},
  undoLastConsume: async () => {},
  lastConsumedItem: null,
});

export function FridgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [activeFridge, setActiveFridgeState] = useState<Fridge | null>(null);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastConsumedItem, setLastConsumedItem] = useState<ScannedItem | null>(null);

  const refreshFridges = useCallback(async () => {
    if (!user) return;

    // Step 1: get fridge IDs this user belongs to
    const { data: memberRows, error: memberError } = await supabase
      .from("fridge_members")
      .select("fridge_id")
      .eq("user_id", user.id);

    if (memberError || !memberRows) return;

    const fridgeIds = memberRows.map((r: { fridge_id: string }) => r.fridge_id);
    if (fridgeIds.length === 0) {
      setFridges([]);
      return;
    }

    // Step 2: fetch those fridges
    const { data: fridgeData, error: fridgeError } = await supabase
      .from("fridges")
      .select("*")
      .in("id", fridgeIds)
      .order("created_at");

    if (fridgeError || !fridgeData) return;

    setFridges(fridgeData);

    const savedId = await AsyncStorage.getItem(ACTIVE_FRIDGE_KEY);
    const found = fridgeData.find((f: Fridge) => f.id === savedId);
    if (found) {
      setActiveFridgeState(found);
    } else if (fridgeData.length > 0) {
      setActiveFridgeState(prev => prev ?? fridgeData[0]);
    }
  }, [user]);

  const refreshItems = useCallback(async () => {
    if (!activeFridge) return;
    const { data } = await supabase
      .from("scanned_items")
      .select("*")
      .eq("fridge_id", activeFridge.id)
      .eq("consumed", false)
      .order("expiry_date", { ascending: true });
    if (data) setItems(data);
  }, [activeFridge]);

  const setActiveFridge = useCallback(async (fridge: Fridge) => {
    setActiveFridgeState(fridge);
    await AsyncStorage.setItem(ACTIVE_FRIDGE_KEY, fridge.id);
  }, []);

  const markConsumed = useCallback(async (itemId: string, quantity: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setLastConsumedItem(item);

    if (item.quantity <= quantity) {
      await supabase.from("scanned_items").update({
        consumed: true,
        consumed_at: new Date().toISOString(),
        consumed_by: user?.id,
      }).eq("id", itemId);
    } else {
      await supabase.from("scanned_items").update({ quantity: item.quantity - quantity }).eq("id", itemId);
    }
    await refreshItems();
  }, [items, user, refreshItems]);

  const undoLastConsume = useCallback(async () => {
    if (!lastConsumedItem) return;
    await supabase.from("scanned_items").update({
      consumed: false,
      consumed_at: null,
      consumed_by: null,
      quantity: lastConsumedItem.quantity,
    }).eq("id", lastConsumedItem.id);
    setLastConsumedItem(null);
    await refreshItems();
  }, [lastConsumedItem, refreshItems]);

  useEffect(() => {
    if (!user) {
      setFridges([]);
      setActiveFridgeState(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshFridges().finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (activeFridge) refreshItems();
  }, [activeFridge]);

  useEffect(() => {
    if (!activeFridge) return;
    const channel = supabase
      .channel(`fridge-${activeFridge.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "scanned_items",
        filter: `fridge_id=eq.${activeFridge.id}`,
      }, () => { refreshItems(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeFridge]);

  return (
    <FridgeContext.Provider value={{
      fridges, activeFridge, items, loading,
      setActiveFridge, refreshFridges, refreshItems,
      markConsumed, undoLastConsume, lastConsumedItem,
    }}>
      {children}
    </FridgeContext.Provider>
  );
}

export const useFridge = () => useContext(FridgeContext);
