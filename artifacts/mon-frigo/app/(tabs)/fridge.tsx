import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useFridge } from "@/contexts/FridgeContext";
import { useScan } from "@/contexts/ScanContext";
import { useShake } from "@/hooks/useShake";
import { ItemCard } from "@/components/ItemCard";
import { ConsumeSheet } from "@/components/ConsumeSheet";
import { FAB } from "@/components/FAB";
import { FridgeSelector } from "@/components/FridgeSelector";
import { ScannedItem } from "@/lib/supabase";
import i18n from "@/i18n";

export default function FridgeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fridges, activeFridge, items, loading, refreshFridges, refreshItems, markConsumed, undoLastConsume, lastConsumedItem } = useFridge();
  const { startSession } = useScan();
  const [consumeItem, setConsumeItem] = useState<ScannedItem | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useShake(async () => {
    if (lastConsumedItem) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await undoLastConsume();
      setUndoVisible(false);
    }
  }, !!lastConsumedItem);

  const handleConsume = useCallback(async (item: ScannedItem) => {
    setConsumeItem(item);
  }, []);

  const confirmConsume = useCallback(async (quantity: number) => {
    if (!consumeItem) return;
    await markConsumed(consumeItem.id, quantity);
    setConsumeItem(null);
    setUndoVisible(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVisible(false), 5000);
  }, [consumeItem, markConsumed]);

  const handleStartScan = useCallback(async () => {
    const id = await startSession();
    if (id) router.push("/scan/barcode");
  }, [startSession]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (fridges.length === 0 && !loading) {
    return (
      <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
        <View style={[styles.emptyContainer, { paddingTop: topPad + 20 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="snow-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {i18n.t("fridge.noFridge")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {i18n.t("fridge.createFirst")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
              {i18n.t("settings.createFridge")}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <FridgeSelector />
        <TouchableOpacity
          onPress={refreshItems}
          style={[styles.refreshBtn, { backgroundColor: colors.frost, borderColor: colors.frostBorder }]}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 120 : insets.bottom + 100 }
          ]}
          scrollEnabled={items.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshItems}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.delay(index * 40).duration(300)}>
              <ItemCard
                item={item}
                onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
                onSwipeConsume={() => handleConsume(item)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="snow-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyListTitle, { color: colors.foreground }]}>
                {i18n.t("fridge.emptyFridge")}
              </Text>
              <Text style={[styles.emptyListSub, { color: colors.mutedForeground }]}>
                {i18n.t("fridge.startScanning")}
              </Text>
            </View>
          }
        />
      )}

      {undoVisible && (
        <Animated.View entering={SlideInRight} style={[styles.undoBanner, { backgroundColor: colors.primary }]}>
          <Text style={[styles.undoText, { color: colors.primaryForeground }]}>
            {i18n.t("fridge.shakeToUndo")}
          </Text>
          <TouchableOpacity onPress={async () => { await undoLastConsume(); setUndoVisible(false); }}>
            <Text style={[styles.undoAction, { color: "#93C5FD" }]}>
              {i18n.t("fridge.undoConsume")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <FAB onPress={handleStartScan} />

      <ConsumeSheet
        item={consumeItem}
        onConfirm={confirmConsume}
        onClose={() => setConsumeItem(null)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingTop: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  createBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyList: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyListTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyListSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  undoBanner: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 90,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  undoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  undoAction: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
