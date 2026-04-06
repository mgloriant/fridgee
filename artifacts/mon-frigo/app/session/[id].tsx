import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ItemCard } from "@/components/ItemCard";
import { supabase, ScannedItem } from "@/lib/supabase";
import i18n from "@/i18n";

export default function SessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDate, setSessionDate] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      const { data: session } = await supabase.from("scan_sessions").select("created_at").eq("id", id).single();
      if (session) {
        const d = new Date(session.created_at);
        setSessionDate(d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }));
      }
      const { data } = await supabase.from("scanned_items").select("*").eq("session_id", id).order("created_at");
      if (data) setItems(data);
      setLoading(false);
    };
    fetchItems();
  }, [id]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>{i18n.t("sessions.sessionDetail")}</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{sessionDate}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          scrollEnabled={items.length > 0}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="nutrition-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>{i18n.t("common.noData")}</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  date: { fontSize: 13, fontFamily: "Inter_400Regular" },
  list: { paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
