import React, { useState } from "react";
import {
  ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import i18n from "@/i18n";

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ConfirmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingItem, saveItem, setPendingItem } = useScan();
  const [saving, setSaving] = useState(false);

  const handleValidate = async () => {
    if (!pendingItem) return;
    setSaving(true);
    await saveItem(pendingItem);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    setPendingItem(null);
    router.replace("/scan/barcode");
  };

  const handleEdit = () => {
    router.back();
  };

  const handleFinish = async () => {
    if (pendingItem) {
      setSaving(true);
      await saveItem(pendingItem);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaving(false);
    }
    router.push("/scan/summary");
  };

  if (!pendingItem) {
    router.back();
    return null;
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 10, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{i18n.t("scan.validate")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.frostBorder }]}>
          {pendingItem.image_url ? (
            <Image source={{ uri: pendingItem.image_url }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
              <Ionicons name="nutrition-outline" size={48} color={colors.primary} />
            </View>
          )}

          <Text style={[styles.productName, { color: colors.foreground }]}>
            {pendingItem.product_name || i18n.t("common.unknown")}
          </Text>
          {pendingItem.brand ? (
            <Text style={[styles.brand, { color: colors.mutedForeground }]}>{pendingItem.brand}</Text>
          ) : null}
          {pendingItem.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={3}>{pendingItem.description}</Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{i18n.t("scan.expiryDate")}</Text>
              <Text style={[styles.metaValue, { color: pendingItem.expiry_date ? colors.foreground : colors.mutedForeground }]}>
                {formatDate(pendingItem.expiry_date)}
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{i18n.t("scan.purchaseDate")}</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {formatDate(pendingItem.purchase_date)}
              </Text>
            </View>
          </View>

          {pendingItem.barcode ? (
            <Text style={[styles.barcode, { color: colors.mutedForeground }]}>
              {pendingItem.barcode}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.editBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.foreground} />
            <Text style={[styles.editBtnTxt, { color: colors.foreground }]}>{i18n.t("scan.edit")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleValidate}
            disabled={saving}
            style={[styles.validateBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1, flex: 2 }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />
                <Text style={[styles.validateTxt, { color: colors.primaryForeground }]}>
                  {i18n.t("scan.validate")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleFinish}
          style={[styles.finishBtn, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.finishTxt, { color: colors.secondaryForeground }]}>
            {i18n.t("scan.finish")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  image: { width: 120, height: 120, borderRadius: 12 },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  productName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  brand: { fontSize: 14, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  divider: { width: "100%", height: 1, marginVertical: 4 },
  metaRow: { flexDirection: "row", width: "100%", gap: 0 },
  metaItem: { flex: 1, alignItems: "center", gap: 4 },
  metaDivider: { width: 1, marginVertical: 4 },
  metaLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  barcode: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 1 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1, borderRadius: 14, height: 52,
  },
  editBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  validateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52,
  },
  validateTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  finishBtn: { borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center" },
  finishTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
