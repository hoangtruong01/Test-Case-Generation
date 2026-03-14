import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { EmptyView } from "../../components/ui/StateViews";
import { TextInput } from "../../components/ui/TextInput";
import { RootStackParamList } from "../../navigation/types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminJiraTokens">;
};

type JiraToken = {
  id: string;
  username: string;
  jiraAccountId: string;
  refreshToken: string;
  expiresAt: string;
};

const MOCK_TOKENS: JiraToken[] = [
  { id: "tok_1", username: "khoa", jiraAccountId: "5f8d123abc001", refreshToken: "ATJIRA-7d93f4d8b92d9e123456abcdef0987", expiresAt: "2026-05-10" },
  { id: "tok_2", username: "anna", jiraAccountId: "5f8d123abc002", refreshToken: "ATJIRA-2c93a2f9a8b1a222223456abcdef987", expiresAt: "2026-04-01" },
  { id: "tok_3", username: "john", jiraAccountId: "5f8d123abc003", refreshToken: "ATJIRA-9aa1f1c98b2d9e888823456abcdef111", expiresAt: "2025-12-01" },
  { id: "tok_4", username: "lucas", jiraAccountId: "5f8d123abc004", refreshToken: "ATJIRA-2ab8f2f98b2d9e777723456abcdef222", expiresAt: "2026-06-20" },
];

const maskToken = (token: string) =>
  token.length > 14 ? `${token.slice(0, 8)}${"*".repeat(12)}${token.slice(-4)}` : token;

const AdminJiraTokensScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_TOKENS;
    return MOCK_TOKENS.filter(
      (t) =>
        t.username.toLowerCase().includes(q) ||
        t.jiraAccountId.toLowerCase().includes(q),
    );
  }, [search]);

  if (!isAuthenticated) {
    return (
      <EmptyView
        icon="shield-outline"
        title="Admin Access Required"
        message="Sign in with an admin account to manage Jira tokens."
        actionLabel="Go to Admin Login"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Jira Tokens</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
          Manage Jira OAuth refresh tokens
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search username or Jira account id..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isVisible = visibleIds.has(item.id);
          const isExpired = new Date(item.expiresAt) < new Date();
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.rowTop}>
                <Text style={[styles.user, { color: colors.text }]}>{item.username}</Text>
                <TouchableOpacity
                  style={[styles.revokeBtn, { borderColor: colors.destructive }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="remove-circle-outline" size={14} color={colors.destructive} />
                  <Text style={[styles.revokeText, { color: colors.destructive }]}>Revoke</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.meta, { color: colors.textMuted }]}> 
                {item.id} • {item.jiraAccountId}
              </Text>

              <View style={[styles.tokenBox, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                <Text style={[styles.token, { color: colors.textSecondary }]}> 
                  {isVisible ? item.refreshToken : maskToken(item.refreshToken)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setVisibleIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) {
                        next.delete(item.id);
                      } else {
                        next.add(item.id);
                      }
                      return next;
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isVisible ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.rowBottom}>
                <Text style={[styles.expireLabel, { color: colors.textMuted }]}>Expires:</Text>
                <View
                  style={[
                    styles.expireBadge,
                    {
                      backgroundColor: isExpired
                        ? colors.destructive + "20"
                        : colors.primary + "20",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isExpired ? colors.destructive : colors.primary,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {new Date(item.expiresAt).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyView
            icon="key-outline"
            title="No tokens"
            message="No tokens match your search."
          />
        }
      />
    </View>
  );
};

export default AdminJiraTokensScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 4 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  user: {
    fontSize: 15,
    fontWeight: "700",
  },
  revokeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  revokeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  meta: {
    fontSize: 11,
    marginTop: 4,
  },
  tokenBox: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  token: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  rowBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expireLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  expireBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
