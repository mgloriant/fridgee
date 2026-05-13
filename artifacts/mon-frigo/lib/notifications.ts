import * as ExpoNotifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ScannedItem } from "./supabase";
import { API_BASE_URL } from "@/config";

// ── Types ─────────────────────────────────────────────────────────────

export type NotifSettings = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  daysThreshold: number; // notify when item expires within N days
  notifHour: number;     // 0-23, in user's local timezone
};

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  pushEnabled: true,
  emailEnabled: false,
  daysThreshold: 2,
  notifHour: 19,
};

// ── Storage keys ──────────────────────────────────────────────────────

const SETTINGS_KEY = "@monfrigo_notif_settings";
const LAST_EMAIL_KEY = "@monfrigo_last_email_date";

export async function loadNotifSettings(): Promise<NotifSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIF_SETTINGS;
    return { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIF_SETTINGS;
  }
}

export async function saveNotifSettings(settings: NotifSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Helpers ───────────────────────────────────────────────────────────

function daysUntilExpiry(expiry: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Returns items expiring exactly on offsetDays from today + within threshold
function itemsExpiringFromDate(
  items: ScannedItem[],
  fromDateOffset: number, // 0 = today, 1 = tomorrow, …
  threshold: number
): ScannedItem[] {
  return items.filter(item => {
    if (!item.expiry_date || item.consumed) return false;
    const d = daysUntilExpiry(item.expiry_date) - fromDateOffset;
    return d >= 0 && d <= threshold;
  });
}

function formatItemList(items: ScannedItem[]): string {
  const unique = Array.from(
    new Map(items.map(i => [i.product_name ?? "Inconnu", i])).values()
  );
  return unique
    .slice(0, 8)
    .map(i => {
      const days = daysUntilExpiry(i.expiry_date!);
      if (days < 0) return `• ${i.product_name ?? "Inconnu"} (expiré)`;
      if (days === 0) return `• ${i.product_name ?? "Inconnu"} (expire aujourd'hui)`;
      return `• ${i.product_name ?? "Inconnu"} (dans ${days}j)`;
    })
    .join("\n");
}

// ── Push notifications ────────────────────────────────────────────────

export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await ExpoNotifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await ExpoNotifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleExpiryNotifications(
  items: ScannedItem[],
  settings: NotifSettings
): Promise<void> {
  if (Platform.OS === "web") return;
  if (!settings.pushEnabled) {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  // Cancel all existing to rebuild from scratch
  await ExpoNotifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const currentHour = now.getHours();

  // Schedule for today + next 13 days
  for (let offsetDays = 0; offsetDays <= 13; offsetDays++) {
    // Skip today if the notification hour has already passed
    if (offsetDays === 0 && currentHour >= settings.notifHour) continue;

    const expiringItems = itemsExpiringFromDate(items, offsetDays, settings.daysThreshold);
    if (expiringItems.length === 0) continue;

    // Build trigger date: offsetDays from today at notifHour:00
    const trigger = new Date();
    trigger.setDate(trigger.getDate() + offsetDays);
    trigger.setHours(settings.notifHour, 0, 0, 0);

    const count = expiringItems.length;
    const body = formatItemList(expiringItems);

    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title: `Mon Frigo — ${count} produit${count > 1 ? "s" : ""} à consommer`,
        body,
        sound: true,
        data: { type: "expiry" },
      },
      trigger: { type: "date", date: trigger },
    });
  }
}

// ── Email notifications ───────────────────────────────────────────────

export async function checkAndSendEmailNotification(
  items: ScannedItem[],
  settings: NotifSettings,
  userEmail: string
): Promise<void> {
  if (!settings.emailEnabled || !userEmail) return;

  const now = new Date();
  if (now.getHours() < settings.notifHour) return; // not yet time

  const today = isoToday();
  const lastSent = await AsyncStorage.getItem(LAST_EMAIL_KEY);
  if (lastSent === today) return; // already sent today

  const expiringItems = itemsExpiringFromDate(items, 0, settings.daysThreshold);
  if (expiringItems.length === 0) return; // nothing to notify about

  try {
    const res = await fetch(`${API_BASE_URL}/notifications/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail,
        items: expiringItems.map(i => ({
          name: i.product_name ?? "Inconnu",
          brand: i.brand,
          expiryDate: i.expiry_date,
          daysLeft: daysUntilExpiry(i.expiry_date!),
        })),
        daysThreshold: settings.daysThreshold,
      }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(LAST_EMAIL_KEY, today);
    }
  } catch {
    // Silent — will retry next app open
  }
}
