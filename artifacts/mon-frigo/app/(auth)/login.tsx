import React, { useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import i18n from "@/i18n";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) { setError(i18n.t("auth.error.emailRequired")); return; }
    if (!password) { setError(i18n.t("auth.error.passwordRequired")); return; }
    setLoading(true);
    setError("");
    const result = await signIn(email.trim(), password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <LinearGradient colors={["#0A1929", "#1E3A5F", "#0D3B6E"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="snow-outline" size={44} color="#60A5FA" />
            </View>
            <Text style={styles.appName}>Mon Frigo</Text>
            <Text style={styles.tagline}>{i18n.t("auth.welcomeBack")}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)" }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>{i18n.t("auth.email")}</Text>
              <View style={[styles.inputWrap, { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)" }]}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={i18n.t("auth.emailPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{i18n.t("auth.password")}</Text>
              <View style={[styles.inputWrap, { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)" }]}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={i18n.t("auth.passwordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass(s => !s)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.5)" />
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? i18n.t("auth.signingIn") : i18n.t("auth.signIn")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t("auth.noAccount")}</Text>
            <Pressable onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.footerLink}>{i18n.t("auth.signUp")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoArea: { alignItems: "center", marginBottom: 36 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    marginBottom: 24,
  },
  errorBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  field: { gap: 6 },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    height: 50,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  primaryBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    color: "#60A5FA",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
