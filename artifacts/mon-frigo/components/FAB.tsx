import React from "react";
import { Pressable, StyleSheet, Text, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onPress: () => void;
  label?: string;
};

export function FAB({ onPress, label }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bottomOffset = Platform.OS === "web" ? 100 : insets.bottom + 80;

  return (
    <Animated.View style={[styles.wrapper, { bottom: bottomOffset }, animStyle]}>
      <Pressable
        onPress={handlePress}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="camera-outline" size={24} color={colors.primaryForeground} />
        {label ? (
          <Text style={[styles.label, { color: colors.primaryForeground }]}>{label}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 20,
    zIndex: 100,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
