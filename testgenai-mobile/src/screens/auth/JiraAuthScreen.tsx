import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { API_BASE_URL } from "../../config/apiconfig";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const JiraAuthScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { loginJira } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Open the backend OAuth login in an in-app browser.
      // The backend redirects back with token/session params.
      // Pass mobile=1 so the backend callback uses the deep link scheme.
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_BASE_URL}/jira/login?mobile=1`,
        "testgenai://callback",
      );

      if (result.type === "success" && result.url) {
        // Parse callback URL for token, session, user
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const session = url.searchParams.get("session");
        const userParam = url.searchParams.get("user");

        if (token && userParam && session) {
          const user = JSON.parse(userParam);
          await loginJira(user, token, session);
          Toast.show({
            type: "success",
            text1: `Welcome, ${user.name || "user"}!`,
          });
          navigation.replace("Dashboard");
          return;
        }
      }
      setError("Authentication was cancelled or failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.iconBg, { backgroundColor: colors.primary + "15" }]}
        >
          <Ionicons name="log-in-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Connect to Jira
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sign in with your Atlassian account to access your Jira projects and
          issues
        </Text>
      </View>

      {/* Info box */}
      <View
        style={[
          styles.demoBox,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.demoTitle, { color: colors.text }]}>
          How it works:
        </Text>
        <Text style={[styles.demoText, { color: colors.textSecondary }]}>
          1. Tap "Connect with Jira" below
        </Text>
        <Text style={[styles.demoText, { color: colors.textSecondary }]}>
          2. Sign in with your Atlassian account
        </Text>
        <Text style={[styles.demoText, { color: colors.textSecondary }]}>
          3. Authorize access to your Jira workspace
        </Text>
        <Text style={[styles.demoText, { color: colors.textSecondary }]}>
          4. You'll be redirected back automatically
        </Text>
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.destructive + "15",
              borderColor: colors.destructive + "30",
            },
          ]}
        >
          <Ionicons name="alert-circle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        title="Connect with Jira"
        onPress={handleLogin}
        loading={loading}
        variant="primary"
        size="lg"
        icon={
          !loading ? (
            <Ionicons
              name="log-in-outline"
              size={18}
              color={colors.primaryForeground}
            />
          ) : undefined
        }
      />

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        You will be redirected to Atlassian to authenticate via OAuth 2.0. No
        credentials are stored on this device.
      </Text>
    </ScrollView>
  );
};

export default JiraAuthScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 28 },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  demoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  demoTitle: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  demoText: { fontSize: 12, lineHeight: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },
  footer: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 20,
    lineHeight: 16,
  },
});
