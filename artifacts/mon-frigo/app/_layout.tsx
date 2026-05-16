import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as ExpoNotifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FridgeProvider, useFridge } from "@/contexts/FridgeContext";
import { ScanProvider } from "@/contexts/ScanContext";
import {
  loadNotifSettings,
  scheduleExpiryNotifications,
  checkAndSendEmailNotification,
} from "@/lib/notifications";
import {
  getPendingInvite,
  clearPendingInvite,
  acceptInviteToken,
} from "@/lib/inviteUtils";

// Configure how notifications appear while the app is in the foreground
if (Platform.OS !== "web") {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ── Notification scheduler ─────────────────────────────────────────────
// Lives inside FridgeProvider so it can access items.

function NotificationScheduler() {
  const { user } = useAuth();
  const { items } = useFridge();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const runSchedule = async () => {
    if (Platform.OS === "web") return;
    const settings = await loadNotifSettings();
    await scheduleExpiryNotifications(items, settings);
    if (user?.email) {
      await checkAndSendEmailNotification(items, settings, user.email);
    }
  };

  // Run on mount and whenever items change
  useEffect(() => {
    runSchedule();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Re-run when the app comes to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        runSchedule();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, user]);

  return null;
}

// ── Main navigator ─────────────────────────────────────────────────────

function AppNavigator() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Don't redirect away from the invite screen — it handles its own auth flow
      if (pathname !== "/invite") {
        router.replace("/(auth)/login");
      }
      return;
    }

    // User just logged in — accept any pending invite then go to fridge
    if (pathname !== "/invite") {
      (async () => {
        const pending = await getPendingInvite();
        if (pending?.token) {
          await acceptInviteToken(pending.token);
          await clearPendingInvite();
        }
        router.replace("/(tabs)/fridge");
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen name="session" options={{ headerShown: false }} />
      <Stack.Screen name="item" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ headerShown: false }} />
    </Stack>
  );
}

// ── Root layout ────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <FridgeProvider>
                  <ScanProvider>
                    <NotificationScheduler />
                    <AppNavigator />
                  </ScanProvider>
                </FridgeProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
