import React from "react";
import {
  Image, Platform, Pressable, StyleSheet, Text, View
} from "react-native";
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScannedItem } from "@/lib/supabase";
import i18n from "@/i18n";
import { URGENCY_DAYS } from "@/config";

function getDaysUntilExpiry(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExpiryLabel(daysLeft: number | null, colors: ReturnType<typeof useColors>): { label: string; color: string; bg: string } {
  if (daysLeft === null) return { label: "—", color: colors.mutedForeground, bg: colors.muted };
  if (daysLeft < 0) return { label: i18n.t("urgency.expired"), color: "#fff", bg: colors.urgentRed };
  if (daysLeft === 0) return { label: i18n.t("common.today"), color: "#fff", bg: colors.urgentRed };
  if (daysLeft === 1) return { label: i18n.t("common.tomorrow"), color: "#fff", bg: colors.urgentOrange };
  if (daysLeft <= URGENCY_DAYS.ORANGE) return { label: i18n.t("urgency.daysLeft", { count: daysLeft }), color: "#fff", bg: colors.urgentOrange };
  if (daysLeft <= URGENCY_DAYS.YELLOW) return { label: i18n.t("urgency.daysLeft", { count: daysLeft }), color: "#fff", bg: colors.urgentYellow };
  return { label: i18n.t("urgency.daysLeft", { count: daysLeft }), color: "#fff", bg: colors.urgentGreen };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

type Props = {
  item: ScannedItem;
  groupCount?: number; // total quantity across grouped items
  onPress?: () => void;
  onSwipeConsume?: () => void;
};

export function ItemCard({ item, groupCount, onPress, onSwipeConsume }: Props) {
  const colors = useColors();
  const daysLeft = getDaysUntilExpiry(item.expiry_date);
  // Display the grouped count if provided, otherwise fall back to item.quantity
  const displayCount = groupCount ?? item.quantity;
  const urgency = formatExpiryLabel(daysLeft, colors);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handleSwipe = () => {
    if (!onSwipeConsume) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    translateX.value = withSpring(-300, { damping: 20 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      translateX.value = 0;
      opacity.value = 1;
    });
    setTimeout(onSwipeConsume, 200);
  };

  const hasImage = !!item.image_url;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={Platform.OS !== "web" ? handleSwipe : undefined}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.frostBorder,
            borderRadius: colors.radius,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {hasImage ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="nutrition-outline" size={28} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.product_name ?? i18n.t("common.unknown")}
          </Text>
          {item.brand ? (
            <Text style={[styles.brand, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}
          <View style={styles.row}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>
                {urgency.label}
              </Text>
            </View>
            {item.purchase_date ? (
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {formatDate(item.purchase_date)}
              </Text>
            ) : null}
          </View>
        </View>

        {displayCount > 1 && (
          <View style={[styles.quantityBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.quantityText, { color: colors.primaryForeground }]}>
              ×{displayCount}
            </Text>
          </View>
        )}

        {onSwipeConsume && (
          <Pressable onPress={handleSwipe} style={styles.swipeHint}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  brand: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  urgencyBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgencyText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  quantityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  swipeHint: {
    padding: 4,
    marginLeft: 4,
  },
});
