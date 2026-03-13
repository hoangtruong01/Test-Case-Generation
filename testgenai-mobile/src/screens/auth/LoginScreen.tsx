import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import Toast from "react-native-toast-message";
import { API_BASE_URL } from "../../config/apiconfig";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { login, loginJira } = useAuthStore();

  const [authMode, setAuthMode] = useState<"admin" | "jira">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jiraUsername, setJiraUsername] = useState("");
  const [jiraPassword, setJiraPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    jiraUsername?: string;
    jiraPassword?: string;
  }>({});

  const validateAdmin = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateJira = (): boolean => {
    const newErrors: { jiraUsername?: string; jiraPassword?: string } = {};

    if (!jiraUsername.trim()) {
      newErrors.jiraUsername = "Username is required";
    }

    if (!jiraPassword) {
      newErrors.jiraPassword = "Password is required";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleAdminLogin = async () => {
    if (!validateAdmin()) return;

    setLoading(true);
    try {
      const result = await api.login(username.trim(), password);

      if (result.success && result.user && result.token) {
        await login(
          { name: result.user.name, email: result.user.email, role: "admin" },
          result.token,
        );
        Toast.show({
          type: "success",
          text1: `Welcome, ${result.user.name}!`,
          text2: "Logged in as Admin",
        });
        navigation.replace("Dashboard");
      } else {
        Toast.show({
          type: "error",
          text1: "Login failed",
          text2: result.error || "Invalid credentials",
        });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJiraLogin = async () => {
    if (!validateJira()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        username: jiraUsername.trim(),
        password: jiraPassword,
        mobile: "1",
      });

      const result = await WebBrowser.openAuthSessionAsync(
        `${API_BASE_URL}/jira/login?${params.toString()}`,
        "testgenai://callback",
      );

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const session = url.searchParams.get("session");
        const userParam = url.searchParams.get("user");

        if (token && userParam && session) {
          const user = JSON.parse(userParam) as {
            name?: string;
            email?: string;
            avatar?: string;
          };

          await loginJira(
            {
              name: user.name || jiraUsername.trim(),
              email: user.email || `${jiraUsername.trim()}@jira.local`,
              avatar: user.avatar,
            },
            token,
            session,
          );

          Toast.show({
            type: "success",
            text1: `Welcome, ${user.name || jiraUsername.trim()}!`,
            text2: "Connected to Jira",
          });
          navigation.replace("Dashboard");
          return;
        }
      }

      Toast.show({
        type: "error",
        text1: "Jira login failed",
        text2: "Authentication was cancelled or invalid",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const useJiraDemo = () => {
    setJiraUsername("sarah.chen");
    setJiraPassword("password123");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[styles.iconBg, { backgroundColor: colors.orange + "15" }]}
          >
            <Ionicons
              name={authMode === "admin" ? "shield-checkmark" : "git-branch-outline"}
              size={36}
              color={authMode === "admin" ? colors.orange : colors.primary}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {authMode === "admin" ? "Admin Sign In" : "Jira Sign In"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {authMode === "admin"
              ? "Sign in with your admin account to continue"
              : "Connect with Jira using your web credentials"}
          </Text>
        </View>

        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              {
                borderColor: authMode === "admin" ? colors.orange : colors.border,
                backgroundColor:
                  authMode === "admin" ? colors.orange + "12" : colors.card,
              },
            ]}
            onPress={() => setAuthMode("admin")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={authMode === "admin" ? colors.orange : colors.textMuted}
            />
            <Text
              style={{
                color: authMode === "admin" ? colors.orange : colors.textMuted,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Admin
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              {
                borderColor: authMode === "jira" ? colors.primary : colors.border,
                backgroundColor:
                  authMode === "jira" ? colors.primary + "12" : colors.card,
              },
            ]}
            onPress={() => setAuthMode("jira")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="git-branch-outline"
              size={16}
              color={authMode === "jira" ? colors.primary : colors.textMuted}
            />
            <Text
              style={{
                color: authMode === "jira" ? colors.primary : colors.textMuted,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Jira
            </Text>
          </TouchableOpacity>
        </View>

        {authMode === "admin" ? (
          <View
            style={[
              styles.roleInfo,
              {
                backgroundColor: colors.orange + "10",
                borderColor: colors.orange + "25",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.orange}
            />
            <Text style={[styles.roleInfoText, { color: colors.orange }]}>
              Admin access includes user management, system settings, and full
              project control
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.roleInfo,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary + "25",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.roleInfoText, { color: colors.primary }]}>
              Matches web flow: username/password are sent to backend and OAuth
              callback returns Jira token + session.
            </Text>
          </View>
        )}

        {authMode === "admin" ? (
          <View style={styles.form}>
            <TextInput
              label="Username"
              placeholder="Enter your admin username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) {
                  setErrors((e) => ({ ...e, username: undefined }));
                }
              }}
              error={errors.username}
              autoCapitalize="none"
              leftIcon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textMuted}
                />
              }
            />
            <TextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors((e) => ({ ...e, password: undefined }));
                }
              }}
              error={errors.password}
              isPassword
              leftIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                />
              }
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate("ForgotPassword")}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}> 
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Button
              title="Sign in as Admin"
              onPress={handleAdminLogin}
              loading={loading}
              variant="orange"
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
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              label="Jira Username"
              placeholder="sarah.chen"
              value={jiraUsername}
              onChangeText={(text) => {
                setJiraUsername(text);
                if (errors.jiraUsername) {
                  setErrors((e) => ({ ...e, jiraUsername: undefined }));
                }
              }}
              error={errors.jiraUsername}
              autoCapitalize="none"
              leftIcon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textMuted}
                />
              }
            />
            <TextInput
              label="Jira Password"
              placeholder="Enter your password"
              value={jiraPassword}
              onChangeText={(text) => {
                setJiraPassword(text);
                if (errors.jiraPassword) {
                  setErrors((e) => ({ ...e, jiraPassword: undefined }));
                }
              }}
              error={errors.jiraPassword}
              isPassword
              leftIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                />
              }
            />

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={useJiraDemo}
              activeOpacity={0.7}
            >
              <Ionicons
                name="flash-outline"
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.demoText, { color: colors.primary }]}> 
                Use demo account (sarah.chen / password123)
              </Text>
            </TouchableOpacity>

            <Button
              title="Login to Jira"
              onPress={handleJiraLogin}
              loading={loading}
              variant="primary"
              size="lg"
              icon={
                !loading ? (
                  <Ionicons
                    name="git-branch-outline"
                    size={18}
                    color={colors.primaryForeground}
                  />
                ) : undefined
              }
            />
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>
            or use alternate flow
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Button
          title={authMode === "admin" ? "Sign in with Jira" : "Admin Login Instead"}
          onPress={() =>
            authMode === "admin"
              ? navigation.navigate("JiraAuth")
              : setAuthMode("admin")
          }
          variant="outline"
          size="lg"
          icon={
            <Ionicons
              name={authMode === "admin" ? "git-branch-outline" : "shield-outline"}
              size={18}
              color={colors.text}
            />
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 40 },
  header: { alignItems: "center", marginBottom: 28 },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: "center", maxWidth: 280 },
  switchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  roleInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  roleInfoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  form: { marginBottom: 20 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: "500" },
  demoBtn: {
    marginBottom: 14,
    marginTop: -4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  demoText: { fontSize: 12, fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
});
