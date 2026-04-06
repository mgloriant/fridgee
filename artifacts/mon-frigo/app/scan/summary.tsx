import React from "react";
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import { useFridge } from "@/contexts/FridgeContext";
import i18n from "@/i18n";

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getDaysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

function UrgencyBadge({ dateStr }: { dateStr?: string }) {
  const colors = useColors();
  const days = getDaysLeft(dateStr);
  if (days === null) return null;
  let bg = colors.urgentGreen;
  let label = `${days}j`;
  if (days < 0) { bg = colors.urgentRed; label = i18n.t("urgency.expired"); }
  else if (days === 0) { bg = colors.urgentRed; label = i18n.t("common.today"); }
  else if (days <= 3) { bg = colors.urgentOrange; }
  else if (days <= 7) { bg = colors.urgentYellow; }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeTxt}>{label}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionItems, endSession } = useScan();
  const { refreshItems } = useFridge();

  const handleDone = async () => {
    await endSession();
    await refreshItems();
    router.replace("/(tabs)/fridge");
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {i18n.t("scan.summary")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {sessionItems.length} {i18n.t("scan.itemsScanned")}
          </Text>
        </View>
        <View style={[styles.checkCircle, { backgroundColor: colors.success + "22", borderColor: colors.success }]}>
          <Ionicons name="checkmark" size={24} color={colors.success} />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sessionItems}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 110 }]}
        scrollEnabled={sessionItems.length > 0}
        renderItem={({ item, index }) => (
          <View style={[
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.frostBorder,
              borderRadius: colors.radius,
            }
          ]}>
            <Text style={styles.indexNum}>{index + 1}</Text>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.img} />
            ) : (
              <View style={[styles.imgPH, { backgroundColor: colors.secondary }]}>
                <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {item.product_name || i18n.t("common.unknown")}
              </Text>
              {item.brand ? (
                <Text style={[styles.brand, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.brand}
                </Text>
              ) : null}
            </View>
            <View style={styles.right}>
              <UrgencyBadge dateStr={item.expiry_date} />
              {!item.expiry_date && (
                <Text style={[styles.noDlc, { color: colors.mutedForeground }]}>Sans DLC</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>
              Aucun produit scanné
            </Text>
          </View>
        }
      />

      {/* Done button */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          onPress={handleDone}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.doneTxt}>{i18n.t("scan.finish")}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  indexNum: {
    width: 22,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    textAlign: "center",
  },
  img: { width: 42, height: 42, borderRadius: 8 },
  imgPH: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  brand: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  right: { alignItems: "flex-end" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  noDlc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTxt: { fontSize: 15, fontFamily: "Inter_400Regular" },
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  doneBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  doneTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
