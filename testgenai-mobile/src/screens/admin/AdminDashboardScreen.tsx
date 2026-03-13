import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { useAdminStore } from "../../store/adminStore";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { LoadingView, ErrorView, EmptyView } from "../../components/ui/StateViews";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { stats, setStats, setSelectedProjectKey } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setStats]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStats();
    }, [fetchStats]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const statCardStyle = (borderColor: string): ViewStyle => ({
    ...styles.statCard,
    borderLeftColor: borderColor,
    borderLeftWidth: 3,
  });

  if (!isAuthenticated) {
    return (
      <EmptyView
        icon="shield-outline"
        title="Admin Access Required"
        message="Please sign in with an admin account to view and manage system data."
        actionLabel="Go to Admin Login"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading && !stats) return <LoadingView message="Loading dashboard..." />;
  if (error && !stats) return <ErrorView message={error} onRetry={fetchStats} />;

  const statItems = [
    {
      key: "total",
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: "people-outline" as const,
      color: colors.primary,
    },
    {
      key: "active",
      label: "Active Users",
      value: stats?.activeUsers ?? 0,
      icon: "checkmark-circle-outline" as const,
      color: colors.success,
    },
    {
      key: "deleted",
      label: "Deleted Users",
      value: stats?.deletedUsers ?? 0,
      icon: "trash-outline" as const,
      color: colors.destructive,
    },
    {
      key: "cases",
      label: "Total Test Cases",
      value: stats?.totalTestCases ?? 0,
      icon: "document-text-outline" as const,
      color: colors.orange,
    },
  ];

  const quickActions = [
    {
      key: "create-project",
      label: "Create Project",
      icon: "add-circle-outline" as const,
      onPress: () => navigation.navigate("ProjectsTab"),
    },
    {
      key: "add-test-case",
      label: "Add Test Case",
      icon: "create-outline" as const,
      onPress: () => {
        setSelectedProjectKey(null);
        navigation.navigate("TestCasesTab");
      },
    },
    {
      key: "invite-user",
      label: "Invite User",
      icon: "person-add-outline" as const,
      onPress: () => {
        Toast.show({ type: "info", text1: "Invite flow", text2: "Open Users to add a new member" });
        navigation.navigate("UsersTab");
      },
    },
    {
      key: "sync-jira",
      label: "Sync Jira",
      icon: "sync-outline" as const,
      onPress: () => navigation.getParent()?.navigate("AdminJiraTokens" as never),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Admin Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Compact overview for mobile
        </Text>
      </View>

      {/* Stats Cards - 2 columns */}
      <View style={styles.statsGrid}>
        {statItems.map((item) => (
          <View key={item.key} style={styles.statGridItem}>
            <Card style={statCardStyle(item.color)}>
              <View style={styles.statTopRow}>
                <View
                  style={[styles.statIcon, { backgroundColor: item.color + "18" }]}
                >
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {item.value}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            </Card>
          </View>
        ))}
      </View>

      {/* Projects */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Projects</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProjectsTab")}>
            <Text style={[styles.linkText, { color: colors.primary }]}>View all</Text>
          </TouchableOpacity>
        </View>

        {(stats?.projectTestCases || []).slice(0, 6).map((p) => (
          <TouchableOpacity
            key={p.projectKey}
            style={[styles.projectCard, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => {
              setSelectedProjectKey(p.projectKey);
              navigation.navigate("TestCasesTab");
            }}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                {p.projectName}
              </Text>
              <Text style={[styles.projectKeyText, { color: colors.textMuted }]}>
                {p.projectKey}
              </Text>
            </View>
            <View
              style={[styles.projectCountBadge, { backgroundColor: colors.primary + "18" }]}
            >
              <Text style={[styles.projectCountText, { color: colors.primary }]}>
                {p.count}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Quick Actions */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              onPress={action.onPress}
              style={[styles.quickButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              activeOpacity={0.85}
            >
              <Ionicons name={action.icon} size={20} color={colors.primary} />
              <Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>More Modules</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate("AdminTestSuites" as never)}
            style={[
              styles.quickButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="albums-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLabel, { color: colors.text }]}>Test Suites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate("AdminJiraTokens" as never)}
            style={[
              styles.quickButton,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLabel, { color: colors.text }]}>Jira Tokens</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={{ height: 14 }} />
    </ScrollView>
  );
};

export default AdminDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 3 },
  statsGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statGridItem: {
    width: "48.5%",
  },
  statCard: {
    marginBottom: 10,
    minHeight: 88,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  sectionCard: { marginHorizontal: 16, marginBottom: 10 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  linkText: { fontSize: 12, fontWeight: "700" },
  projectCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  projectName: { fontSize: 13, fontWeight: "700" },
  projectKeyText: { fontSize: 11, marginTop: 1 },
  projectCountBadge: {
    borderRadius: 999,
    minWidth: 28,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  projectCountText: { fontSize: 11, fontWeight: "700" },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickButton: {
    width: "48.5%",
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
});
