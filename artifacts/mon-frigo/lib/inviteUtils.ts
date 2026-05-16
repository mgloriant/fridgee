import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/config";

export const PENDING_INVITE_KEY = "pendingInviteToken";

export type PendingInvite = {
  token: string;
  fridge: string;
  icon: string;
  by: string;
};

export async function savePendingInvite(invite: PendingInvite): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
}

export async function getPendingInvite(): Promise<PendingInvite | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingInvite;
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}

export async function acceptInviteToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Non connecté" };

    const res = await fetch(`${API_BASE_URL}/invite/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, accessToken: session.access_token }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) return { success: false, error: body.error ?? "Erreur serveur" };
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}
