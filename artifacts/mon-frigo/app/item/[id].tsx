import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { supabase, ScannedItem } from "@/lib/supabase";
import i18n from "@/i18n";

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ItemDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ScannedItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      const { data } = await supabase.from("scanned_items").select("*").eq("id", id).single();
      if (data) setItem(data);
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: topPad + 20 }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>{i18n.t("common.noData")}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: topPad + 10, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{i18n.t("sessions.itemDetail")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.frostBorder }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.imagePH, { backgroundColor: colors.secondary }]}>
              <Ionicons name="nutrition-outline" size={52} color={colors.primary} />
            </View>
          )}

          <Text style={[styles.name, { color: colors.foreground }]}>
            {item.product_name ?? i18n.t("common.unknown")}
          </Text>
          {item.brand ? (
            <Text style={[styles.brand, { color: colors.mutedForeground }]}>{item.brand}</Text>
          ) : null}
          {item.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>{item.description}</Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLbl, { color: colors.mutedForeground }]}>{i18n.t("scan.expiryDate")}</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.expiry_date)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLbl, { color: colors.mutedForeground }]}>{i18n.t("scan.purchaseDate")}</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.purchase_date)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={[styles.metaLbl, { color: colors.mutedForeground }]}>{i18n.t("fridge.quantity")}</Text>
              <Text style={[styles.metaVal, { color: colors.foreground }]}>×{item.quantity}</Text>
            </View>
            {item.barcode && (
              <View style={styles.metaCell}>
                <Text style={[styles.metaLbl, { color: colors.mutedForeground }]}>{i18n.t("scan.barcode")}</Text>
                <Text style={[styles.metaValSmall, { color: colors.foreground }]}>{item.barcode}</Text>
              </View>
            )}
          </View>

          {item.consumed && (
            <View style={[styles.consumed, { backgroundColor: colors.success + "22", borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.consumedTxt, { color: colors.success }]}>{i18n.t("fridge.consumed")}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push({ pathname: "/session/[id]", params: { id: item.session_id } })}
          style={[styles.sessionLink, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="scan-outline" size={18} color={colors.primary} />
          <Text style={[styles.sessionLinkTxt, { color: colors.primary }]}>
            {i18n.t("sessions.sessionDetail")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  image: { width: 140, height: 140, borderRadius: 14 },
  imagePH: { width: 140, height: 140, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  brand: { fontSize: 15, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  divider: { width: "100%", height: 1 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "center" },
  metaCell: { alignItems: "center", minWidth: 100 },
  metaLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  metaValSmall: { fontSize: 14, fontFamily: "Inter_500Medium" },
  consumed: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  consumedTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notFound: { fontSize: 16, textAlign: "center" },
  sessionLink: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  sessionLinkTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
