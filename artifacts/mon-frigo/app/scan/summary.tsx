import React from "react";
import {
  FlatList, Platform, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useScan } from "@/contexts/ScanContext";
import i18n from "@/i18n";

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionItems, endSession } = useScan();

  const handleDone = async () => {
    await endSession();
    router.replace("/(tabs)/fridge");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{i18n.t("scan.summary")}</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {sessionItems.length} {i18n.t("scan.itemsScanned")}
        </Text>
      </View>

      <FlatList
        data={sessionItems}
        keyExtractor={i => i.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        scrollEnabled={sessionItems.length > 0}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.frostBorder, borderRadius: colors.radius }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
              <Ionicons name="nutrition-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {item.product_name ?? i18n.t("common.unknown")}
              </Text>
              {item.expiry_date ? (
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                  {formatDate(item.expiry_date)}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {i18n.t("common.noData")}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={handleDone}
        style={[
          styles.doneBtn,
          { backgroundColor: colors.primary, bottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }
        ]}
      >
        <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />
        <Text style={[styles.doneTxt, { color: colors.primaryForeground }]}>
          {i18n.t("scan.finish")}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  count: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  doneBtn: {
    position: "absolute",
    left: 20, right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    height: 54,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  doneTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
