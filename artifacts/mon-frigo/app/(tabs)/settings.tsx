import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useFridge } from "@/contexts/FridgeContext";
import { supabase, Fridge, FridgeInvitation } from "@/lib/supabase";
import i18n from "@/i18n";
import { API_BASE_URL, FRIDGE_COLORS, FRIDGE_ICONS, NOTIFICATION_DELAY_OPTIONS } from "@/config";
import {
  loadNotifSettings,
  saveNotifSettings,
  scheduleExpiryNotifications,
  requestNotifPermission,
  type NotifSettings,
} from "@/lib/notifications";

// ── Helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ icon, label, value, onPress, danger, last }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
    >
      <Ionicons name={icon as any} size={20} color={danger ? colors.danger : colors.mutedForeground} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.foreground }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { fridges, items, refreshFridges } = useFridge();

  const [invitations, setInvitations] = useState<FridgeInvitation[]>([]);

  // Notification settings — loaded from AsyncStorage on mount
  const [notifSettings, setNotifSettings] = useState<NotifSettings>({
    pushEnabled: true,
    emailEnabled: false,
    daysThreshold: 2,
    notifHour: 19,
  });

  const [showCreateFridge, setShowCreateFridge] = useState(false);
  const [newFridgeName, setNewFridgeName] = useState("");
  const [newFridgeColor, setNewFridgeColor] = useState(FRIDGE_COLORS[0]);
  const [newFridgeIcon, setNewFridgeIcon] = useState(FRIDGE_ICONS[0]);
  const [creating, setCreating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFridge, setInviteFridge] = useState<Fridge | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Load notification settings on mount
  useEffect(() => {
    loadNotifSettings().then(setNotifSettings);
  }, []);

  const applyNotifSettings = useCallback(async (next: NotifSettings) => {
    setNotifSettings(next);
    await saveNotifSettings(next);
    await scheduleExpiryNotifications(items, next);
  }, [items]);

  const handlePushToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotifPermission();
      if (!granted) {
        Alert.alert(
          i18n.t("settings.notifications.push"),
          i18n.t("settings.notifications.permissionDenied")
        );
        return;
      }
    }
    await applyNotifSettings({ ...notifSettings, pushEnabled: value });
  }, [notifSettings, applyNotifSettings]);

  const handleEmailToggle = useCallback(async (value: boolean) => {
    await applyNotifSettings({ ...notifSettings, emailEnabled: value });
  }, [notifSettings, applyNotifSettings]);

  const handleDelayChange = useCallback(async (days: number) => {
    await applyNotifSettings({ ...notifSettings, daysThreshold: days });
  }, [notifSettings, applyNotifSettings]);

  const handleHourChange = useCallback(async (delta: number) => {
    const next = ((notifSettings.notifHour + delta) + 24) % 24;
    await applyNotifSettings({ ...notifSettings, notifHour: next });
  }, [notifSettings, applyNotifSettings]);

  // ── Invitations ────────────────────────────────────────────────────

  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("fridge_invitations")
      .select("*, fridges(name, color, icon)")
      .eq("invited_email", user.email ?? "")
      .eq("status", "pending");
    if (data) setInvitations(data);
  }, [user]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  // ── Fridge creation ────────────────────────────────────────────────

  const handleCreateFridge = async () => {
    if (!newFridgeName.trim() || !user) return;
    setCreating(true);

    const { data, error } = await supabase.from("fridges").insert({
      name: newFridgeName.trim(),
      color: newFridgeColor,
      icon: newFridgeIcon,
      owner_id: user.id,
    }).select().single();

    if (error || !data) {
      setCreating(false);
      Alert.alert("Erreur création frigo", error?.message ?? "Erreur inconnue.");
      return;
    }

    const { error: memberError } = await supabase
      .from("fridge_members")
      .insert({ fridge_id: data.id, user_id: user.id, role: "owner" });

    if (memberError) {
      await supabase.from("fridges").delete().eq("id", data.id);
      setCreating(false);
      Alert.alert("Erreur", memberError.message ?? "Impossible d'ajouter le membre.");
      return;
    }

    await refreshFridges();
    setCreating(false);
    setShowCreateFridge(false);
    setNewFridgeName("");
    setNewFridgeColor(FRIDGE_COLORS[0]);
    setNewFridgeIcon(FRIDGE_ICONS[0]);
  };

  // ── Invitations ────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteFridge || !user) return;
    setInviting(true);

    const email = inviteEmail.trim().toLowerCase();
    const token = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const { error: dbError } = await supabase.from("fridge_invitations").insert({
      fridge_id: inviteFridge.id,
      invited_email: email,
      invited_by: user.id,
      status: "pending",
      token,
    });

    if (dbError) {
      setInviting(false);
      console.error("[handleInvite] Supabase error:", JSON.stringify(dbError, null, 2));
      Alert.alert("Erreur", `${dbError.message}\n\ncode: ${dbError.code}\ndetails: ${dbError.details ?? "—"}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/invitations/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedEmail: email,
          inviterEmail: user.email,
          fridgeName: inviteFridge.name,
          fridgeIcon: inviteFridge.icon,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          Alert.alert("Invitation enregistrée", `L'invitation pour ${email} est enregistrée. Configurez RESEND_API_KEY pour l'email.`);
        } else {
          Alert.alert("Invitation enregistrée", `Sauvegardée mais email non envoyé : ${body.error ?? "erreur inconnue"}.`);
        }
      } else {
        Alert.alert("Invitation envoyée !", `Un email a été envoyé à ${email}.`);
      }
    } catch {
      Alert.alert("Invitation enregistrée", "Sauvegardée mais email non envoyé (erreur réseau).");
    }

    setInviting(false);
    setShowInviteModal(false);
    setInviteEmail("");
  };

  const handleAcceptInvite = async (inv: FridgeInvitation) => {
    if (!user) return;
    await supabase.from("fridge_invitations").update({ status: "accepted" }).eq("id", inv.id);
    await supabase.from("fridge_members").insert({ fridge_id: inv.fridge_id, user_id: user.id, role: "member" });
    await refreshFridges();
    await fetchInvitations();
  };

  const handleDeclineInvite = async (inv: FridgeInvitation) => {
    await supabase.from("fridge_invitations").update({ status: "declined" }).eq("id", inv.id);
    await fetchInvitations();
  };

  // ── Render ─────────────────────────────────────────────────────────

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const hourLabel = `${String(notifSettings.notifHour).padStart(2, "0")}:00`;

  return (
    <LinearGradient colors={["#EFF6FF", "#DBEAFE", "#BFDBFE"]} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 12, paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>{i18n.t("settings.title")}</Text>

        {/* Account */}
        <Section title={i18n.t("settings.account")}>
          <Row icon="person-outline" label={i18n.t("settings.email")} value={user?.email ?? ""} />
          <Row icon="log-out-outline" label={i18n.t("auth.signOut")} onPress={signOut} danger last />
        </Section>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <Section title={i18n.t("settings.pendingInvitations")}>
            {invitations.map((inv, idx) => (
              <View
                key={inv.id}
                style={[styles.invRow, idx < invitations.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <View style={styles.invInfo}>
                  <Text style={[styles.invFridge, { color: colors.foreground }]}>
                    {inv.fridges?.icon} {inv.fridges?.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAcceptInvite(inv)}
                  style={[styles.invBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.invBtnText, { color: colors.primaryForeground }]}>
                    {i18n.t("settings.accept")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeclineInvite(inv)}
                  style={[styles.invBtn, { backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.invBtnText, { color: colors.secondaryForeground }]}>
                    {i18n.t("settings.decline")}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Section>
        )}

        {/* Fridges */}
        <Section title={i18n.t("settings.fridges")}>
          {fridges.map((fridge, idx) => (
            <View
              key={fridge.id}
              style={[styles.fridgeRow, idx < fridges.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[styles.fridgeColorDot, { backgroundColor: fridge.color }]} />
              <Text style={styles.fridgeIcon}>{fridge.icon}</Text>
              <Text style={[styles.fridgeName, { color: colors.foreground }]}>{fridge.name}</Text>
              <TouchableOpacity
                onPress={() => { setInviteFridge(fridge); setShowInviteModal(true); }}
                style={[styles.smallBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.secondaryForeground} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setShowCreateFridge(true)}
            style={[styles.addFridgeBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addFridgeTxt, { color: colors.primary }]}>{i18n.t("settings.addFridge")}</Text>
          </TouchableOpacity>
        </Section>

        {/* Notifications */}
        <Section title={i18n.t("settings.notifications.title")}>
          {/* Push toggle */}
          <View style={styles.switchRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{i18n.t("settings.notifications.push")}</Text>
            <Switch
              value={notifSettings.pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {/* Email toggle */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>{i18n.t("settings.notifications.email")}</Text>
            <Switch
              value={notifSettings.emailEnabled}
              onValueChange={handleEmailToggle}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {/* Delay (days before expiry) */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{i18n.t("settings.notifications.delay")}</Text>
            <View style={styles.delayBtns}>
              {NOTIFICATION_DELAY_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => handleDelayChange(d)}
                  style={[
                    styles.delayBtn,
                    { borderColor: colors.border },
                    notifSettings.daysThreshold === d && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[
                    styles.delayBtnTxt,
                    { color: notifSettings.daysThreshold === d ? colors.primaryForeground : colors.mutedForeground },
                  ]}>
                    {d}j
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hour picker */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.mutedForeground} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{i18n.t("settings.notifications.time")}</Text>
            <View style={styles.hourControl}>
              <TouchableOpacity
                onPress={() => handleHourChange(-1)}
                style={[styles.hourBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="remove" size={16} color={colors.secondaryForeground} />
              </TouchableOpacity>
              <Text style={[styles.hourLabel, { color: colors.foreground }]}>{hourLabel}</Text>
              <TouchableOpacity
                onPress={() => handleHourChange(1)}
                style={[styles.hourBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="add" size={16} color={colors.secondaryForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </Section>
      </ScrollView>

      {/* Create fridge modal */}
      <Modal visible={showCreateFridge} transparent animationType="slide" onRequestClose={() => setShowCreateFridge(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateFridge(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {i18n.t("settings.createFridge")}
          </Text>
          <TextInput
            style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
            value={newFridgeName}
            onChangeText={setNewFridgeName}
            placeholder={i18n.t("settings.fridgeName")}
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>{i18n.t("settings.fridgeIcon")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
            {FRIDGE_ICONS.map(icon => (
              <TouchableOpacity
                key={icon}
                onPress={() => setNewFridgeIcon(icon)}
                style={[styles.iconOpt, newFridgeIcon === icon && { borderColor: colors.primary, borderWidth: 2 }]}
              >
                <Text style={styles.iconOptTxt}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>{i18n.t("settings.fridgeColor")}</Text>
          <View style={styles.colorRow}>
            {FRIDGE_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setNewFridgeColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, newFridgeColor === c && styles.colorDotSelected]}
              />
            ))}
          </View>
          <TouchableOpacity
            onPress={handleCreateFridge}
            disabled={creating || !newFridgeName.trim()}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (creating || !newFridgeName.trim()) ? 0.5 : 1 }]}
          >
            {creating ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <Text style={[styles.primaryBtnTxt, { color: colors.primaryForeground }]}>
                {i18n.t("settings.createFridge")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Invite modal */}
      <Modal visible={showInviteModal} transparent animationType="slide" onRequestClose={() => setShowInviteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {i18n.t("settings.inviteByEmail")}
          </Text>
          <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
            {inviteFridge?.icon} {inviteFridge?.name}
          </Text>
          <TextInput
            style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input }]}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="email@exemple.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (inviting || !inviteEmail.trim()) ? 0.5 : 1 }]}
          >
            {inviting ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <Text style={[styles.primaryBtnTxt, { color: colors.primaryForeground }]}>
                {i18n.t("settings.invite")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6, paddingLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  rowIcon: { width: 24 },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fridgeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  fridgeColorDot: { width: 10, height: 10, borderRadius: 5 },
  fridgeIcon: { fontSize: 18 },
  fridgeName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  smallBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  addFridgeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderTopWidth: 1,
  },
  addFridgeTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  invRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  invInfo: { flex: 1 },
  invFridge: { fontSize: 14, fontFamily: "Inter_500Medium" },
  invBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  invBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  delayBtns: { flexDirection: "row", gap: 6 },
  delayBtn: {
    width: 32, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  delayBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hourControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  hourBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  hourLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", minWidth: 48, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  iconScroll: { marginHorizontal: -4 },
  iconOpt: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginHorizontal: 4, borderWidth: 1, borderColor: "transparent",
  },
  iconOptTxt: { fontSize: 22 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff" },
  primaryBtn: { borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center" },
  primaryBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
