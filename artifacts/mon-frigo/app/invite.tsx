import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  savePendingInvite,
  clearPendingInvite,
  acceptInviteToken,
} from "@/lib/inviteUtils";

export default function InviteScreen() {
  const { token, fridge, icon, by } = useLocalSearchParams<{
    token: string;
    fridge: string;
    icon: string;
    by: string;
  }>();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  type Status = "loading" | "ready" | "accepting" | "done" | "error";
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const fridgeLabel = [icon, fridge].filter(Boolean).join(" ") || "Frigo partagé";

  useEffect(() => {
    if (loading) return;
    if (!token) {
      setStatus("error");
      setErrorMsg("Lien d'invitation invalide.");
      return;
    }
    savePendingInvite({
      token,
      fridge: fridge ?? "",
      icon: icon ?? "",
      by: by ?? "",
    });
    setStatus("ready");
  }, [loading, token, fridge, icon, by]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus("accepting");
    const result = await acceptInviteToken(token);
    if (result.success) {
      await clearPendingInvite();
      setStatus("done");
      setTimeout(() => router.replace("/(tabs)/fridge"), 1600);
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Erreur inconnue");
    }
  };

  const goToLogin = () => router.replace("/(auth)/login");
  const goToRegister = () => router.replace("/(auth)/register");

  if (status === "loading" || loading) {
    return (
      <LinearGradient colors={["#0A1929", "#1E3A5F", "#0D3B6E"]} style={styles.flex}>
        <ActivityIndicator color="#60A5FA" style={styles.flex} />
      </LinearGradient>
    );
  }

  if (status === "done") {
    return (
      <LinearGradient
        colors={["#0A1929", "#1E3A5F", "#0D3B6E"]}
        style={[styles.flex, styles.center]}
      >
        <View style={styles.doneCard}>
          <Ionicons name="checkmark-circle" size={64} color="#4ADE80" />
          <Text style={styles.doneTitle}>Invitation acceptée !</Text>
          <Text style={styles.doneSub}>
            Bienvenue dans{" "}
            <Text style={styles.doneFridge}>{fridgeLabel}</Text>
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0A1929", "#1E3A5F", "#0D3B6E"]} style={styles.flex}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.logoArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="snow-outline" size={40} color="#60A5FA" />
          </View>
          <Text style={styles.appName}>Mon Frigo</Text>
          <Text style={styles.tagline}>Gestion de votre frigo</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.inviteMsg}>
              {by ? (
                <>
                  <Text style={styles.bold}>{by}</Text>
                  {" vous invite à rejoindre :"}
                </>
              ) : (
                "Vous avez été invité(e) à rejoindre :"
              )}
            </Text>
            <View style={styles.fridgeChip}>
              <Text style={styles.fridgeChipText}>{fridgeLabel}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {status === "error" && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#FCA5A5"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {user ? (
              <Pressable
                style={[
                  styles.primaryBtn,
                  status === "accepting" && styles.btnDisabled,
                ]}
                onPress={handleAccept}
                disabled={status === "accepting"}
              >
                {status === "accepting" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Accepter l'invitation
                  </Text>
                )}
              </Pressable>
            ) : (
              <View>
                <Text style={styles.hint}>
                  Connectez-vous ou créez un compte avec l'adresse qui a reçu
                  cette invitation pour accéder au frigo partagé.
                </Text>
                <Pressable style={styles.primaryBtn} onPress={goToLogin}>
                  <Text style={styles.primaryBtnText}>Se connecter</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={goToRegister}>
                  <Text style={styles.secondaryBtnText}>Créer un compte</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  container: { flex: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(96,165,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  appName: {
    color: "#60A5FA",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  tagline: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  inviteMsg: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  bold: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  fridgeChip: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  fridgeChipText: {
    color: "#60A5FA",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cardBody: { padding: 20 },
  hint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  btnDisabled: { opacity: 0.5 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#FCA5A5", fontSize: 13, flex: 1 },
  doneCard: { alignItems: "center", padding: 32 },
  doneTitle: {
    color: "#4ADE80",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 16,
    marginBottom: 8,
  },
  doneSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    textAlign: "center",
  },
  doneFridge: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
