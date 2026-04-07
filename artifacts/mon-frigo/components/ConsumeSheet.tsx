import React, { useState } from "react";
import {
  Modal, Pressable, StyleSheet, Text, TouchableOpacity, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ScannedItem } from "@/lib/supabase";
import i18n from "@/i18n";

type Props = {
  item: ScannedItem | null;
  maxQuantity?: number; // override item.quantity for grouped items
  onConfirm: (quantity: number) => void;
  onClose: () => void;
};

export function ConsumeSheet({ item, maxQuantity, onConfirm, onClose }: Props) {
  const colors = useColors();
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  const max = maxQuantity ?? item.quantity;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {i18n.t("fridge.consumeTitle")}
        </Text>
        <Text style={[styles.productName, { color: colors.mutedForeground }]}>
          {item.product_name ?? i18n.t("common.unknown")}
        </Text>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            onPress={() => setQuantity(q => Math.max(1, q - 1))}
            style={[styles.qBtn, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="remove" size={20} color={colors.secondaryForeground} />
          </TouchableOpacity>
          <Text style={[styles.qValue, { color: colors.foreground }]}>{quantity}</Text>
          <TouchableOpacity
            onPress={() => setQuantity(q => Math.min(max, q + 1))}
            style={[styles.qBtn, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="add" size={20} color={colors.secondaryForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.ofText, { color: colors.mutedForeground }]}>
          / {max}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>
              {i18n.t("fridge.cancel")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={() => onConfirm(quantity)}
          >
            <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>
              {i18n.t("fridge.confirm")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 8,
  },
  qBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  qValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    minWidth: 50,
    textAlign: "center",
  },
  ofText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
