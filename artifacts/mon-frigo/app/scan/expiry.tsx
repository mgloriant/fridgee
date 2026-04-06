import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import i18n from "@/i18n";

// ── Helpers ──────────────────────────────────────────────────────────

function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toStorageDate(ddmmyyyy: string): string | undefined {
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return undefined;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Screen ───────────────────────────────────────────────────────────

export default function ExpiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingItem, sessionItems, saveItem, setPendingItem } = useScan();
  const [expiryInput, setExpiryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const count = sessionItems.length;

  if (!pendingItem) {
    router.replace("/scan/barcode");
    return null;
  }

  const handleExpiryChange = (text: string) => {
    setExpiryInput(autoFormatDate(text));
  };

  const buildItem = () => ({
    ...pendingItem,
    expiry_date: toStorageDate(expiryInput),
    purchase_date: today(),
    quantity: pendingItem.quantity ?? 1,
  });

  // "Valider et scanner le suivant"
  const handleValidateAndNext = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveItem(buildItem());
    setSaving(false);
    setPendingItem(null);
    // Replace so the stack stays clean, barcode screen remounts fresh
    router.replace("/scan/barcode");
  };

  // "J'ai terminé" — save last item and go to summary
  const handleFinish = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveItem(buildItem());
    setSaving(false);
    setPendingItem(null);
    router.replace("/scan/summary");
  };

  // Skip DLC — save without date and go back to camera
  const handleSkip = async () => {
    setSaving(true);
    await saveItem({ ...pendingItem, quantity: pendingItem.quantity ?? 1 });
    setSaving(false);
    setPendingItem(null);
    router.replace("/scan/barcode");
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;
  const hasProduct = !!(pendingItem.product_name || pendingItem.brand || pendingItem.image_url);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.replace("/scan/barcode")}
              style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="scan-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {i18n.t("scan.photoExpiry")}
              </Text>
              {count > 0 && (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  {count} {i18n.t("scan.itemsScanned")}
                </Text>
              )}
            </View>
          </View>

          {/* Finish button always accessible */}
          <TouchableOpacity
            onPress={handleFinish}
            disabled={saving}
            style={[styles.finishBtn, { backgroundColor: colors.primary }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.finishTxt}>{i18n.t("scan.finish")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Product card ── */}
        {hasProduct ? (
          <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.frostBorder }]}>
            {pendingItem.image_url ? (
              <Image source={{ uri: pendingItem.image_url }} style={styles.productImg} resizeMode="contain" />
            ) : (
              <View style={[styles.productImgPH, { backgroundColor: colors.secondary }]}>
                <Ionicons name="nutrition-outline" size={30} color={colors.primary} />
              </View>
            )}
            <View style={styles.productMeta}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                {pendingItem.product_name || i18n.t("common.unknown")}
              </Text>
              {pendingItem.brand ? (
                <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>
                  {pendingItem.brand}
                </Text>
              ) : null}
              {pendingItem.barcode ? (
                <Text style={[styles.productBarcode, { color: colors.mutedForeground }]}>
                  {pendingItem.barcode}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.unknownCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.unknownTxt, { color: colors.primary }]}>
              {i18n.t("scan.productNotFound")}
            </Text>
          </View>
        )}

        {/* ── DLC input ── */}
        <View style={[styles.dlcCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.dlcLabel, { color: colors.mutedForeground }]}>
            {i18n.t("scan.expiryDate")}
          </Text>
          <TextInput
            ref={inputRef}
            style={[styles.dlcInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
            value={expiryInput}
            onChangeText={handleExpiryChange}
            placeholder="jj/mm/aaaa"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={10}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleValidateAndNext}
          />
          <Text style={[styles.dlcHint, { color: colors.mutedForeground }]}>
            Entrez la date de péremption indiquée sur l'emballage
          </Text>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          {/* Primary: validate + next */}
          <TouchableOpacity
            onPress={handleValidateAndNext}
            disabled={saving}
            style={[styles.nextBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.nextBtnTxt}>{i18n.t("scan.validate")}</Text>
                <Ionicons name="scan-outline" size={18} color="rgba(255,255,255,0.7)" />
              </>
            )}
          </TouchableOpacity>

          {/* Skip DLC */}
          <TouchableOpacity
            onPress={handleSkip}
            disabled={saving}
            style={[styles.skipBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.skipTxt, { color: colors.mutedForeground }]}>
              Sans DLC
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  finishBtn: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: "center",
  },
  finishTxt: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Product card
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  productImg: { width: 68, height: 68, borderRadius: 10 },
  productImgPH: {
    width: 68, height: 68, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  productMeta: { flex: 1, gap: 3 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productBrand: { fontSize: 12, fontFamily: "Inter_400Regular" },
  productBarcode: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },

  unknownCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  unknownTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // DLC
  dlcCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  dlcLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dlcInput: {
    borderWidth: 1,
    borderRadius: 14,
    height: 60,
    paddingHorizontal: 16,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 3,
  },
  dlcHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // Actions
  actions: { gap: 10 },
  nextBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "center",
  },
  skipBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  skipTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
