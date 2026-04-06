import React, { useState } from "react";
import {
  ActivityIndicator, Image, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import i18n from "@/i18n";

function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function formatDateForStorage(ddmmyyyy: string): string | undefined {
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return undefined;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export default function ExpiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { pendingItem, setPendingItem } = useScan();
  const [expiryInput, setExpiryInput] = useState("");
  const [photoMode, setPhotoMode] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = React.useRef<any>(null);

  const handleExpiryChange = (text: string) => {
    const formatted = autoFormatDate(text);
    setExpiryInput(formatted);
  };

  const handleConfirm = () => {
    const expiryDate = formatDateForStorage(expiryInput);
    const today = new Date().toISOString().split("T")[0];
    setPendingItem({
      ...pendingItem!,
      expiry_date: expiryDate,
      purchase_date: today,
    });
    router.replace("/scan/confirm");
  };

  const handlePhotoCapture = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7 });
      setPhotoMode(false);
    } catch {
      // ignore
    }
    setCapturing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!pendingItem) {
    router.back();
    return null;
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 10, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{i18n.t("scan.photoExpiry")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {pendingItem.image_url || pendingItem.product_name ? (
          <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.frostBorder }]}>
            {pendingItem.image_url ? (
              <Image source={{ uri: pendingItem.image_url }} style={styles.productImg} />
            ) : (
              <View style={[styles.productImgPlaceholder, { backgroundColor: colors.secondary }]}>
                <Ionicons name="nutrition-outline" size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground }]}>
                {pendingItem.product_name ?? i18n.t("common.unknown")}
              </Text>
              {pendingItem.brand ? (
                <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>{pendingItem.brand}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {i18n.t("scan.expiryDate")}
          </Text>
          <TextInput
            style={[styles.dateInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
            value={expiryInput}
            onChangeText={handleExpiryChange}
            placeholder="jj/mm/aaaa"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={10}
          />

          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={() => setPhotoMode(p => !p)}
              style={[styles.photoBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={[styles.photoBtnTxt, { color: colors.primary }]}>
                {i18n.t("scan.pointAtDLC")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {photoMode && Platform.OS !== "web" && permission?.granted && (
          <View style={styles.cameraBox}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <TouchableOpacity
              onPress={handlePhotoCapture}
              disabled={capturing}
              style={[styles.captureBtn, { backgroundColor: colors.primary }]}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="aperture-outline" size={28} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.confirmTxt, { color: colors.primaryForeground }]}>
            {i18n.t("common.done")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/scan/confirm")} style={styles.skipBtn}>
          <Text style={[styles.skipTxt, { color: colors.mutedForeground }]}>
            {i18n.t("common.done")} ({i18n.t("common.unknown")})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  productImg: { width: 60, height: 60, borderRadius: 10 },
  productImgPlaceholder: { width: 60, height: 60, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productBrand: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  dateInput: { borderWidth: 1, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 2 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, alignSelf: "flex-start" },
  photoBtnTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cameraBox: { borderRadius: 14, overflow: "hidden", marginBottom: 16, height: 220, position: "relative" },
  camera: { flex: 1 },
  captureBtn: {
    position: "absolute", bottom: 12, alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  confirmBtn: { borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  confirmTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
