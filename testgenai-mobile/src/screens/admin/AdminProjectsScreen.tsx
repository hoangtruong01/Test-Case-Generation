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
import { AdminProject } from "../../types/jira";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminProjects">;
};

const emptyForm = { projectName: "", description: "", owner: "" };

const AdminProjectsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const rows = await api.getAdminProjects();
      setProjects(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProjects();
    }, [fetchProjects]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.projectName.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (project: AdminProject) => {
    setEditingId(project.id);
    setForm({
      projectName: project.projectName,
      description: project.description,
      owner: project.owner,
    });
    setIsFormOpen(true);
  };

  const saveProject = async () => {
    if (!form.projectName.trim() || !form.owner.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Project name and owner are required",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateAdminProject(editingId, {
          projectName: form.projectName.trim(),
          description: form.description.trim(),
          owner: form.owner.trim(),
        });
        Toast.show({ type: "success", text1: "Project updated" });
      } else {
        await api.createAdminProject({
          projectName: form.projectName.trim(),
          description: form.description.trim(),
          owner: form.owner.trim(),
        });
        Toast.show({ type: "success", text1: "Project created" });
      }

      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchProjects();
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

  const confirmDelete = (project: AdminProject) => {
    Alert.alert(
      "Delete project",
      `Delete "${project.projectName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAdminProject(project.id);
              Toast.show({ type: "success", text1: "Project deleted" });
              fetchProjects();
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
        message="Sign in with an admin account to manage projects."
        actionLabel="Go to Admin Login"
        onAction={() => navigation.navigate("Login")}
      />
    );
  }

  if (loading && projects.length === 0) return <LoadingView message="Loading projects..." />;
  if (error && projects.length === 0) {
    return <ErrorView title="Failed to load projects" message={error} onRetry={fetchProjects} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Projects</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
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
          placeholder="Search project, owner or description..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
        />
      </View>

      {isFormOpen && (
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingId ? "Edit Project" : "Create Project"}
          </Text>

          <TextInput
            label="Project Name"
            placeholder="Project name"
            value={form.projectName}
            onChangeText={(projectName) => setForm((p) => ({ ...p, projectName }))}
          />
          <TextInput
            label="Owner"
            placeholder="Owner username"
            value={form.owner}
            onChangeText={(owner) => setForm((p) => ({ ...p, owner }))}
            autoCapitalize="none"
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
              onPress={saveProject}
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
                <Text style={[styles.projectName, { color: colors.text }]}>{item.projectName}</Text>
                <Text style={[styles.projectMeta, { color: colors.textSecondary }]}>
                  {item.owner} • {new Date(item.createdAt).toLocaleDateString("vi-VN")}
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
              <Text style={[styles.projectDesc, { color: colors.textMuted }]}>{item.description}</Text>
            )}

            <View style={[styles.suiteChip, { backgroundColor: colors.primary + "15" }]}> 
              <Text style={[styles.suiteChipText, { color: colors.primary }]}> 
                {item.totalTestSuites} suite{item.totalTestSuites !== 1 ? "s" : ""}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyView
            icon="folder-open-outline"
            title="No projects"
            message="No projects match your search."
          />
        }
      />
    </View>
  );
};

export default AdminProjectsScreen;

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
  formCard: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  formActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  formBtn: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  rowTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  projectName: { fontSize: 15, fontWeight: "700" },
  projectMeta: { fontSize: 12, marginTop: 2 },
  projectDesc: { fontSize: 12, marginTop: 8 },
  suiteChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suiteChipText: { fontSize: 11, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});