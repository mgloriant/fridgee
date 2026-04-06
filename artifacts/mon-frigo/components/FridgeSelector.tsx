import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFridge } from "@/contexts/FridgeContext";
import { Fridge } from "@/lib/supabase";
import i18n from "@/i18n";

export function FridgeSelector() {
  const colors = useColors();
  const { fridges, activeFridge, setActiveFridge } = useFridge();
  const [open, setOpen] = useState(false);

  if (fridges.length === 0) return null;

  const select = (fridge: Fridge) => {
    setActiveFridge(fridge);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.frost, borderColor: colors.frostBorder }]}
      >
        <Text style={styles.icon}>{activeFridge?.icon ?? "❄️"}</Text>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {activeFridge?.name ?? i18n.t("fridge.selectFridge")}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.dropTitle, { color: colors.mutedForeground }]}>
            {i18n.t("fridge.selectFridge")}
          </Text>
          <ScrollView>
            {fridges.map(f => (
              <Pressable
                key={f.id}
                onPress={() => select(f)}
                style={[styles.option, f.id === activeFridge?.id && { backgroundColor: colors.secondary }]}
              >
                <Text style={styles.optIcon}>{f.icon}</Text>
                <Text style={[styles.optName, { color: colors.foreground }]}>{f.name}</Text>
                {f.id === activeFridge?.id && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 220,
  },
  icon: { fontSize: 18 },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  dropdown: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 320,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dropTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optIcon: { fontSize: 20 },
  optName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
