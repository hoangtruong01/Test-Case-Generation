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
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { AdminProject, AdminTestSuite } from "../../types/jira";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminTestSuites">;
};

const emptyForm = {
  suiteName: "",
  projectId: "",
  projectName: "",
  description: "",
};

const AdminTestSuitesScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [suites, setSuites] = useState<AdminTestSuite[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [suiteRows, projectRows] = await Promise.all([
        api.getAdminTestSuites(),
        api.getAdminProjects(),
      ]);
      setSuites(suiteRows);
      setProjects(projectRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test suites");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suites.filter((s) => {
      const matchesSearch =
        !q ||
        s.suiteName.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q);
      const matchesProject =
        projectFilter === "ALL" || s.projectId === projectFilter || s.projectName === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [suites, search, projectFilter]);

  const projectNameOptions = useMemo(() => {
    return [
      ...new Map(projects.map((p) => [p.projectName, p])).values(),
    ];
  }, [projects]);

  const openCreate = () => {
    const firstProject = projects[0];
    setEditingId(null);
    setForm({
      ...emptyForm,
      projectId: firstProject?.id || "",
      projectName: firstProject?.projectName || "",
    });
    setIsFormOpen(true);
  };

  const openEdit = (suite: AdminTestSuite) => {
    setEditingId(suite.id);
    setForm({
      suiteName: suite.suiteName,
      projectId: suite.projectId,
      projectName: suite.projectName,
      description: suite.description,
    });
    setIsFormOpen(true);
  };

  const chooseProject = (project: AdminProject) => {
    setForm((prev) => ({
      ...prev,
      projectId: project.id,
      projectName: project.projectName,
    }));
  };

  const saveSuite = async () => {
    if (!form.suiteName.trim() || !form.projectName.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Suite name and project are required",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateAdminTestSuite(editingId, {
          suiteName: form.suiteName.trim(),
          projectId: form.projectId,
          projectName: form.projectName,
          description: form.description.trim(),
        });
        Toast.show({ type: "success", text1: "Test suite updated" });
      } else {
        await api.createAdminTestSuite({
          suiteName: form.suiteName.trim(),
          projectId: form.projectId,
          projectName: form.projectName,
          description: form.description.trim(),
        });
        Toast.show({ type: "success", text1: "Test suite created" });
      }

      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (suite: AdminTestSuite) => {
    Alert.alert(
      "Delete test suite",
      `Delete "${suite.suiteName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAdminTestSuite(suite.id);
              Toast.show({ type: "success", text1: "Test suite deleted" });
              fetchData();
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Delete failed",
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
        message="Sign in with an admin account to manage test suites."
        actionLabel="Go to Admin Login"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading && suites.length === 0) return <LoadingView message="Loading test suites..." />;
  if (error && suites.length === 0) {
    return <ErrorView title="Failed to load test suites" message={error} onRetry={fetchData} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Test Suites</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            {filtered.length} suite{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={openCreate}
        >
          <Ionicons name="add" size={16} color={colors.primaryForeground} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search test suites..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={["ALL", ...projectNameOptions.map((p) => p.projectName)]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterContent}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = item === projectFilter || item === "ALL" && projectFilter === "ALL";
            return (
              <TouchableOpacity
                onPress={() => {
                  if (item === "ALL") {
                    setProjectFilter("ALL");
                    return;
                  }
                  const found = projectNameOptions.find((p) => p.projectName === item);
                  setProjectFilter(found?.id || item);
                }}
                style={[
                  styles.filterChip,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primary + "18" : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? colors.primary : colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {item === "ALL" ? "All Projects" : item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isFormOpen && (
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingId ? "Edit Test Suite" : "Create Test Suite"}
          </Text>

          <TextInput
            label="Suite Name"
            placeholder="Suite name"
            value={form.suiteName}
            onChangeText={(suiteName) => setForm((p) => ({ ...p, suiteName }))}
          />

          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Project</Text>
          <FlatList
            horizontal
            data={projectNameOptions}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectOptionRow}
            renderItem={({ item }) => {
              const isActive = form.projectId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => chooseProject(item)}
                  style={[
                    styles.projectOptionChip,
                    {
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primary + "18" : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? colors.primary : colors.textMuted,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {item.projectName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <TextInput
            label="Description"
            placeholder="Short description"
            value={form.description}
            onChangeText={(description) => setForm((p) => ({ ...p, description }))}
          />

          <View style={styles.formActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setIsFormOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              style={styles.formBtn}
            />
            <Button
              title={editingId ? "Update" : "Create"}
              variant="primary"
              onPress={saveSuite}
              loading={saving}
              style={styles.formBtn}
            />
          </View>
        </Card>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.suiteName, { color: colors.text }]}>{item.suiteName}</Text>
                <Text style={[styles.suiteMeta, { color: colors.textSecondary }]}> 
                  {item.projectName} • {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.primary + "15" }]}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>

            {!!item.description && (
              <Text style={[styles.suiteDesc, { color: colors.textMuted }]}>{item.description}</Text>
            )}

            <View style={[styles.countChip, { backgroundColor: colors.primary + "15" }]}> 
              <Text style={[styles.countText, { color: colors.primary }]}> 
                {item.totalTestCases} test case{item.totalTestCases !== 1 ? "s" : ""}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyView
            icon="albums-outline"
            title="No test suites"
            message="No suites match your filter."
          />
        }
      />
    </View>
  );
};

export default AdminTestSuitesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { fontSize: 12, fontWeight: "700" },
  searchWrap: { paddingHorizontal: 16, paddingTop: 4 },
  filterRow: { paddingTop: 6, paddingBottom: 6 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  formCard: { marginHorizontal: 16, marginBottom: 8 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  formLabel: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  projectOptionRow: { gap: 8, paddingBottom: 8 },
  projectOptionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  formBtn: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  rowTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  suiteName: { fontSize: 15, fontWeight: "700" },
  suiteMeta: { fontSize: 12, marginTop: 2 },
  suiteDesc: { fontSize: 12, marginTop: 8 },
  countChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 11, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});