import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import { useFridge } from "@/contexts/FridgeContext";
import { OPENFOODFACTS_BASE_URL } from "@/config";
import i18n from "@/i18n";

export default function BarcodeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const { setPendingItem, activeSession } = useScan();
  const { activeFridge } = useFridge();
  const lastScan = useRef(0);

  const fetchProduct = useCallback(async (barcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${OPENFOODFACTS_BASE_URL}/${barcode}.json`);
      const json = await res.json();
      if (json.status === 1) {
        const p = json.product;
        setPendingItem({
          barcode,
          product_name: p.product_name || p.product_name_fr || "",
          brand: p.brands || "",
          description: p.generic_name || p.generic_name_fr || "",
          image_url: p.image_url || p.image_small_url || "",
          quantity: 1,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/scan/expiry");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPendingItem({ barcode, quantity: 1 });
        setManualMode(true);
        setManualBarcode(barcode);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setManualMode(true);
      setManualBarcode(barcode);
    }
    setLoading(false);
  }, [setPendingItem]);

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    const now = Date.now();
    if (!scanning || loading || now - lastScan.current < 2000) return;
    lastScan.current = now;
    setScanning(false);
    await fetchProduct(data);
  }, [scanning, loading, fetchProduct]);

  const handleManualSubmit = () => {
    setPendingItem({
      barcode: manualBarcode || undefined,
      product_name: manualName,
      brand: manualBrand,
      quantity: 1,
    });
    router.replace("/scan/expiry");
  };

  const handleFinish = () => router.push("/scan/summary");

  if (Platform.OS !== "web" && !permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (Platform.OS !== "web" && !permission?.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
        <Ionicons name="camera-off-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.permText, { color: colors.foreground }]}>{i18n.t("scan.cameraPermission")}</Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.permBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.permBtnTxt, { color: colors.primaryForeground }]}>{i18n.t("scan.requestPermission")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {Platform.OS !== "web" && !manualMode ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "code128", "upc_a", "upc_e"] }}
        />
      ) : null}

      <View style={[styles.overlay, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{i18n.t("scan.title")}</Text>
          <TouchableOpacity onPress={handleFinish} style={styles.finishBtn}>
            <Text style={styles.finishTxt}>{i18n.t("scan.finish")}</Text>
          </TouchableOpacity>
        </View>

        {!manualMode ? (
          <View style={styles.scanArea}>
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.loadingTxt}>{i18n.t("scan.fetchingProduct")}</Text>
              </View>
            ) : (
              <>
                <View style={styles.corners}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.scanHint}>{i18n.t("scan.pointCamera")}</Text>
              </>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => setManualMode(m => !m)}
          style={[styles.manualToggle, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <Text style={styles.manualToggleTxt}>
            {manualMode ? i18n.t("scan.scanning") : i18n.t("scan.manualEntry")}
          </Text>
        </TouchableOpacity>

        {manualMode && (
          <View style={[styles.manualCard, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.mInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder={i18n.t("scan.barcode")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.mInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
              value={manualName}
              onChangeText={setManualName}
              placeholder={i18n.t("scan.productName")}
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[styles.mInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
              value={manualBrand}
              onChangeText={setManualBrand}
              placeholder={i18n.t("scan.brand")}
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              onPress={handleManualSubmit}
              disabled={!manualName.trim()}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: !manualName.trim() ? 0.5 : 1 }]}
            >
              <Text style={[styles.submitTxt, { color: colors.primaryForeground }]}>
                {i18n.t("common.done")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  permText: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  permBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  finishBtn: {
    backgroundColor: "rgba(59,130,246,0.85)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
  },
  finishTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scanArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  corners: { width: 220, height: 220, position: "relative" },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#fff", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 4 },
  scanHint: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 24, textAlign: "center" },
  loadingOverlay: { alignItems: "center", gap: 12 },
  loadingTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_400Regular" },
  manualToggle: { alignSelf: "center", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 8 },
  manualToggleTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  manualCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 10 },
  mInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, fontFamily: "Inter_400Regular" },
  submitBtn: { borderRadius: 12, height: 46, alignItems: "center", justifyContent: "center" },
  submitTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
