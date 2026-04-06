import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="login" options={{ title: "Mon Frigo", headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Mon Frigo", headerShown: false }} />
    </Stack>
  );
}
