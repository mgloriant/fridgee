import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import { OPENFOODFACTS_BASE_URL } from "@/config";
import i18n from "@/i18n";

export default function BarcodeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [ready, setReady] = useState(false);          // small delay before enabling scan
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);    // product not found mode
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const lastScan = useRef(0);

  const { setPendingItem, sessionItems } = useScan();
  const count = sessionItems.length;

  // Pulse animation for the scan frame
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Small ready delay so camera can initialise before we accept scans
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  const goToExpiry = useCallback(() => {
    router.replace("/scan/expiry");
  }, []);

  const handleFinish = useCallback(() => {
    router.replace("/scan/summary");
  }, []);

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
        goToExpiry();
      } else {
        // Product not found — show inline manual form
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setManualBarcode(barcode);
        setNotFound(true);
        setLoading(false);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setManualBarcode(barcode);
      setNotFound(true);
      setLoading(false);
    }
  }, [setPendingItem, goToExpiry]);

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    const now = Date.now();
    if (!ready || loading || now - lastScan.current < 2500 || notFound) return;
    lastScan.current = now;
    fetchProduct(data);
  }, [ready, loading, notFound, fetchProduct]);

  const handleManualContinue = useCallback(() => {
    setPendingItem({
      barcode: manualBarcode || undefined,
      product_name: manualName.trim(),
      brand: manualBrand.trim(),
      quantity: 1,
    });
    goToExpiry();
  }, [setPendingItem, manualBarcode, manualName, manualBrand, goToExpiry]);

  const handleSkipBarcode = useCallback(() => {
    setPendingItem({ quantity: 1 });
    goToExpiry();
  }, [setPendingItem, goToExpiry]);

  const resetScan = useCallback(() => {
    setNotFound(false);
    setManualBarcode("");
    setManualName("");
    setManualBrand("");
    lastScan.current = 0;
  }, []);

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  // ── Permission screens ──────────────────────────────────────────────
  if (Platform.OS !== "web" && !permission) {
    return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;
  }

  if (Platform.OS !== "web" && !permission?.granted) {
    return (
      <View style={[styles.center, { paddingHorizontal: 40, gap: 20 }]}>
        <Ionicons name="camera-off-outline" size={52} color="rgba(255,255,255,0.6)" />
        <Text style={styles.permText}>{i18n.t("scan.cameraPermission")}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnTxt}>{i18n.t("scan.requestPermission")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera (native only) */}
      {Platform.OS !== "web" && !notFound && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarcode}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "code128", "upc_a", "upc_e", "qr"],
          }}
        />
      )}

      {/* Dark overlay behind UI panels */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => { router.back(); }}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.topTitle}>{i18n.t("scan.title")}</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countTxt}>{count}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.finishBtn}>
          <Text style={styles.finishTxt}>{i18n.t("scan.finish")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main content ── */}
      {loading ? (
        // Fetching product info
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.hint}>{i18n.t("scan.fetchingProduct")}</Text>
        </View>
      ) : notFound ? (
        // Product not found — manual form
        <View style={styles.notFoundArea}>
          <View style={[styles.notFoundCard, { backgroundColor: "rgba(10,25,41,0.92)" }]}>
            <View style={styles.notFoundHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#FCD34D" />
              <Text style={styles.notFoundTitle}>{i18n.t("scan.productNotFound")}</Text>
            </View>
            {manualBarcode ? (
              <Text style={styles.notFoundBarcode}>{manualBarcode}</Text>
            ) : null}

            <TextInput
              style={styles.mInput}
              value={manualName}
              onChangeText={setManualName}
              placeholder={i18n.t("scan.productName")}
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoFocus
            />
            <TextInput
              style={styles.mInput}
              value={manualBrand}
              onChangeText={setManualBrand}
              placeholder={i18n.t("scan.brand")}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <View style={styles.notFoundBtns}>
              <TouchableOpacity onPress={resetScan} style={styles.retryBtn}>
                <Ionicons name="scan-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.retryTxt}>Rescanner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={manualName.trim() ? handleManualContinue : handleSkipBarcode}
                style={styles.continueBtn}
              >
                <Text style={styles.continueTxt}>
                  {manualName.trim() ? i18n.t("common.done") : "Passer"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // Normal scan mode
        <View style={styles.scanZone}>
          <Animated.View style={[styles.frame, { transform: [{ scale: pulse }] }]}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
          </Animated.View>
          <Text style={styles.hint}>{i18n.t("scan.pointCamera")}</Text>

          {/* Web fallback: type barcode */}
          {Platform.OS === "web" && (
            <View style={styles.webBarcode}>
              <TextInput
                style={styles.webInput}
                placeholder="Code-barres (web)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
                onSubmitEditing={e => fetchProduct(e.nativeEvent.text)}
                returnKeyType="search"
              />
            </View>
          )}
        </View>
      )}

      {/* ── Bottom hint ── */}
      {!loading && !notFound && (
        <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16 }]}>
          <TouchableOpacity onPress={handleSkipBarcode} style={styles.skipBtn}>
            <Ionicons name="add-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.skipTxt}>{i18n.t("scan.manualEntry")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  // Fade overlays at top/bottom for UI readability
  topGradient: {
    position: "absolute", top: 0, left: 0, right: 0, height: 160,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 1,
  },
  bottomGradient: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 130,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 1,
  },

  // Top bar
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  topTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  countBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  countTxt: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  finishBtn: {
    backgroundColor: "rgba(59,130,246,0.9)",
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7,
  },
  finishTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Scan zone
  scanZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    zIndex: 0,
  },
  frame: {
    width: 230,
    height: 230,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#60A5FA",
    borderWidth: 3,
  },
  cTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
  cTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
  cBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
  cBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },
  hint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Web barcode input
  webBarcode: { marginTop: 8 },
  webInput: {
    color: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 200,
    textAlign: "center",
  },

  // Not found card
  notFoundArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 2,
  },
  notFoundCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  notFoundHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  notFoundTitle: { color: "#FCD34D", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  notFoundBarcode: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 1 },
  mInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  notFoundBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    height: 44,
  },
  retryTxt: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_500Medium" },
  continueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    height: 44,
  },
  continueTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  skipTxt: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular" },

  // Permission screen
  permText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  permBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
