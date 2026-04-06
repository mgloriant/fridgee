import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";

const SHAKE_THRESHOLD = 1.8;
const COOLDOWN_MS = 1500;

export function useShake(onShake: () => void, enabled = true) {
  const lastShakeRef = useRef(0);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let subscription: ReturnType<typeof Accelerometer.addListener>;

    Accelerometer.setUpdateInterval(100);
    subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude > SHAKE_THRESHOLD && now - lastShakeRef.current > COOLDOWN_MS) {
        lastShakeRef.current = now;
        onShake();
      }
    });

    return () => subscription?.remove();
  }, [onShake, enabled]);
}
