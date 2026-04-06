import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useScan } from "@/contexts/ScanContext";
import { useFridge } from "@/contexts/FridgeContext";
import { FAB } from "@/components/FAB";
import { supabase, ScanSession } from "@/lib/supabase";
import i18n from "@/i18n";

type SessionWithCount = ScanSession & { item_count: number; fridges?: { name: string } };

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { startSession } = useScan();
  const { activeFridge } = useFridge();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("scan_sessions")
      .select("*, fridges(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (session: ScanSession) => {
          const { count } = await supabase
            .from("scanned_items")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id);
          return { ...session, item_count: count ?? 0 };
        })
      );
      setSessions(withCounts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleStartScan = async () => {
    const id = await startSession();
    if (id) router.push("/scan/barcode");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {i18n.t("sessions.title")}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 120 : insets.bottom + 100 }
          ]}
          scrollEnabled={sessions.length > 0}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchSessions} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/session/[id]", params: { id: item.id } })}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.frostBorder, borderRadius: colors.radius }]}
            >
              <View style={[styles.sessionIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="scan-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardDate, { color: colors.foreground }]}>
                  {formatDate(item.created_at)}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                  {item.item_count} {i18n.t("sessions.items")}
                  {item.fridges?.name ? ` · ${item.fridges.name}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="scan-circle-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {i18n.t("sessions.noSessions")}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {i18n.t("sessions.startFirst")}
              </Text>
            </View>
          }
        />
      )}

      <FAB onPress={handleStartScan} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  list: { paddingTop: 12, paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
});
