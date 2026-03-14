import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { useAdminStore } from "../../store/adminStore";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { AdminUser } from "../../types/jira";
import { Card } from "../../components/ui/Card";
import { LoadingView, ErrorView, EmptyView } from "../../components/ui/StateViews";
import { TextInput } from "../../components/ui/TextInput";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const UserManagementScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { users, setUsers } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const isUserDeleteEnabled = false;

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUsers]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchUsers();
    }, [fetchUsers]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleSoftDelete = (user: AdminUser) => {
    if (!isUserDeleteEnabled) {
      Toast.show({
        type: "info",
        text1: "Delete user is temporarily disabled",
      });
      return;
    }

    Alert.alert(
      "Delete User",
      `Are you sure you want to delete "${user.name}"? This can be reversed later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await api.softDeleteUser(user.id);
            if (result.success) {
              Toast.show({ type: "success", text1: `User "${user.name}" deleted` });
              fetchUsers();
            } else {
              Toast.show({ type: "error", text1: result.error || "Delete failed" });
            }
          },
        },
      ],
    );
  };

  const handleRestore = (user: AdminUser) => {
    if (!isUserDeleteEnabled) {
      Toast.show({
        type: "info",
        text1: "Restore user is temporarily disabled",
      });
      return;
    }

    Alert.alert(
      "Restore User",
      `Restore "${user.name}" back to active?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            const result = await api.restoreUser(user.id);
            if (result.success) {
              Toast.show({ type: "success", text1: `User "${user.name}" restored` });
              fetchUsers();
            } else {
              Toast.show({ type: "error", text1: result.error || "Restore failed" });
            }
          },
        },
      ],
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = showDeleted ? !u.isActive : u.isActive;
    return matchSearch && matchStatus;
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const deletedCount = users.filter((u) => !u.isActive).length;

  if (!isAuthenticated) {
    return (
      <EmptyView
        icon="shield-outline"
        title="Admin Access Required"
        message="Sign in with an admin account to manage users."
        actionLabel="Go to Admin Login"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading && users.length === 0) return <LoadingView message="Loading users..." />;
  if (error && users.length === 0) return <ErrorView message={error} onRetry={fetchUsers} />;

  const renderUser = ({ item }: { item: AdminUser }) => (
    <Card>
      <View style={styles.userRow}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: item.isActive
                ? colors.primary + "20"
                : colors.destructive + "20",
            },
          ]}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: item.isActive ? colors.primary : colors.destructive,
            }}
          >
            {item.name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.userName,
                { color: colors.text },
                !item.isActive && { textDecorationLine: "line-through", opacity: 0.6 },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor:
                    item.role === "admin"
                      ? colors.orange + "15"
                      : colors.primary + "15",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: item.role === "admin" ? colors.orange : colors.primary,
                }}
              >
                {item.role.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.userEmail, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.email}
          </Text>
          <Text style={[styles.userDate, { color: colors.textMuted }]}>
            Joined{" "}
            {new Date(item.createdAt).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
        </View>
        {item.isActive ? (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.destructive + "12" },
              !isUserDeleteEnabled && styles.actionBtnDisabled,
            ]}
            onPress={() => handleSoftDelete(item)}
            disabled={!isUserDeleteEnabled}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.success + "12" },
              !isUserDeleteEnabled && styles.actionBtnDisabled,
            ]}
            onPress={() => handleRestore(item)}
            disabled={!isUserDeleteEnabled}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.success} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryChip, { backgroundColor: colors.success + "15" }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.summaryText, { color: colors.success }]}>
            {activeCount} Active
          </Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: colors.destructive + "15" }]}>
          <Ionicons name="close-circle" size={14} color={colors.destructive} />
          <Text style={[styles.summaryText, { color: colors.destructive }]}>
            {deletedCount} Deleted
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by name or email"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          leftIcon={
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          }
        />
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            !showDeleted && { backgroundColor: colors.primary + "15" },
            !showDeleted && { borderColor: colors.primary, borderWidth: 1 },
          ]}
          onPress={() => setShowDeleted(false)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: !showDeleted ? colors.primary : colors.textMuted,
            }}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            showDeleted && { backgroundColor: colors.destructive + "15" },
            showDeleted && { borderColor: colors.destructive, borderWidth: 1 },
          ]}
          onPress={() => setShowDeleted(true)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: showDeleted ? colors.destructive : colors.textMuted,
            }}
          >
            Deleted
          </Text>
        </TouchableOpacity>
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyView
            icon="people-outline"
            title={showDeleted ? "No deleted users" : "No active users"}
            message={
              showDeleted
                ? "No users have been soft-deleted yet"
                : "No active users found"
            }
          />
        }
      />
    </View>
  );
};

export default UserManagementScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  summaryText: { fontSize: 13, fontWeight: "600" },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  userEmail: { fontSize: 12, marginTop: 2 },
  userDate: { fontSize: 11, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
});
