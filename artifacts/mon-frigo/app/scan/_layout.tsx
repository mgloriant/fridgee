import { Stack } from "expo-router";

export default function ScanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="barcode" />
      <Stack.Screen name="expiry" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
