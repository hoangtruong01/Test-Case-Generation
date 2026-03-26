import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { EmptyView, ErrorView, LoadingView } from "../../components/ui/StateViews";
import { TextInput } from "../../components/ui/TextInput";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { AdminJiraToken } from "../../types/jira";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminJiraTokens">;
};

const maskToken = (token: string) =>
  token.length > 14
    ? `${token.slice(0, 8)}${"*".repeat(12)}${token.slice(-4)}`
    : token;

const AdminJiraTokensScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tokens, setTokens] = useState<AdminJiraToken[]>([]);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setError(null);
      const rows = await api.getAdminJiraTokens();
      setTokens(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Jira tokens");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTokens();
    }, [fetchTokens]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTokens();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.username.toLowerCase().includes(q) ||
        t.jiraAccountId.toLowerCase().includes(q),
    );
  }, [tokens, search]);

  const confirmRevoke = (token: AdminJiraToken) => {
    Alert.alert(
      "Revoke token",
      `Revoke Jira token for ${token.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await api.revokeAdminJiraToken(token.id);
              Toast.show({ type: "success", text1: "Token revoked" });
              fetchTokens();
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Revoke failed",
                text2: err instanceof Error ? err.message : "Please try again",
              });
            }
          },
        },
      ],
    );
  };

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

  if (loading && tokens.length === 0) return <LoadingView message="Loading Jira tokens..." />;
  if (error && tokens.length === 0) {
    return <ErrorView title="Failed to load tokens" message={error} onRetry={fetchTokens} />;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                  onPress={() => confirmRevoke(item)}
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