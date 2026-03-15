import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { TextInput } from "../../components/ui/TextInput";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import {
  LoadingView,
  ErrorView,
  EmptyView,
} from "../../components/ui/StateViews";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { JiraIssue } from "../../types/jira";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ Issues: { projectKey: string } }, "Issues">;
};

const IssuesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { projectKey } = route.params;
  const { colors } = useTheme();
  const { isJiraAuthenticated } = useAuthStore();
  const {
    issues,
    setIssues,
    selectedProject,
    projects,
    setGeneratedTestcases,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      const data = await api.getIssues(projectKey);
      setIssues(data);
      setError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load issues";
      setError(msg);
    }
  }, [projectKey, setIssues]);

  useEffect(() => {
    if (!isJiraAuthenticated) {
      setLoading(false);
      return;
    }
    if (selectedProject?.key === projectKey && issues.length > 0) {
      setLoading(false);
      return;
    }
    fetchIssues().finally(() => setLoading(false));
  }, [
    projectKey,
    isJiraAuthenticated,
    fetchIssues,
    selectedProject,
    issues.length,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIssues();
    setRefreshing(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const filtered = useMemo(
    () =>
      (issues || []).filter(
        (issue) =>
          (issue.fields?.summary || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (issue.key || "").toLowerCase().includes(search.toLowerCase()) ||
          (issue.fields?.description || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (issue.fields?.statusCategory?.name || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [issues, search],
  );

  const handleGenerateTestcases = async () => {
    if (selected.size === 0) return;

    const descriptions = issues
      .filter((i) => selected.has(i.id))
      .map((i) => i.fields?.description || i.fields?.summary || "")
      .filter(Boolean);

    const jiraProjectName =
      selectedProject?.name ||
      projects.find((p) => p.key === projectKey)?.name ||
      "";

    if (!jiraProjectName) {
      Toast.show({
        type: "error",
        text1: "Missing project name",
        text2: "Please reload project and try again",
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generateTestcases(jiraProjectName, descriptions);
      const data = res as Record<string, unknown>;
      const tcs =
        (data.testcases as unknown[]) ||
        (data.testCases as unknown[]) ||
        (data.data as unknown[]) ||
        (Array.isArray(res) ? res : []);

      setGeneratedTestcases(tcs as any);
      Toast.show({ type: "success", text1: "Testcases generated" });
      navigation.navigate("GeneratedTestcases");
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to generate testcases" });
    } finally {
      setGenerating(false);
    }
  };

  if (!isJiraAuthenticated) {
    return (
      <EmptyView
        icon="log-in-outline"
        title="Authentication Required"
        message="Please log in to Jira to access project issues."
        actionLabel="Login to Jira"
        onAction={() => navigation.navigate("JiraAuth")}
      />
    );
  }

  if (loading) return <LoadingView message="Loading issues..." />;

  if (error) {
    return (
      <ErrorView
        title="Failed to Load Issues"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError("");
          fetchIssues().finally(() => setLoading(false));
        }}
        onReAuth={() => navigation.navigate("JiraAuth")}
      />
    );
  }

  const renderIssue = ({ item }: { item: JiraIssue }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleSelect(item.id)}
        style={[
          styles.issueCard,
          {
            backgroundColor: isSelected ? colors.primary + "08" : colors.card,
            borderColor: isSelected ? colors.primary + "30" : colors.border,
          },
        ]}
      >
        <View style={styles.issueRow}>
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={22}
            color={isSelected ? colors.primary : colors.textMuted}
          />
          <View style={styles.issueContent}>
            <View style={styles.issueHeader}>
              <Text style={[styles.issueKey, { color: colors.textSecondary }]}>
                {item.key}
              </Text>
              <StatusBadge
                status={item.fields?.statusCategory?.name || "To Do"}
              />
            </View>
            <Text
              style={[styles.issueSummary, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.fields?.summary || "No summary"}
            </Text>
            {item.fields?.description ? (
              <Text
                style={[styles.issueDesc, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {item.fields.description}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {projectKey} Issues
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {selected.size} of {filtered.length} selected
          </Text>
        </View>
        {selected.size > 0 && (
          <Button
            title="Generate"
            onPress={handleGenerateTestcases}
            loading={generating}
            variant="primary"
            size="sm"
            icon={
              <Ionicons
                name="flash"
                size={14}
                color={colors.primaryForeground}
              />
            }
          />
        )}
      </View>

      {/* Search & Select All */}
      <View style={styles.controls}>
        <TextInput
          placeholder="Search issues..."
          value={search}
          onChangeText={setSearch}
          leftIcon={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textMuted}
            />
          }
        />
        <TouchableOpacity style={styles.selectAllBtn} onPress={toggleAll}>
          <Ionicons
            name={
              selected.size === filtered.length && filtered.length > 0
                ? "checkbox"
                : "square-outline"
            }
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selected.size === filtered.length && filtered.length > 0
              ? "Deselect All"
              : "Select All"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderIssue}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyView
            icon="document-text-outline"
            title="No Issues"
            message="No issues found for this project."
          />
        }
      />
    </View>
  );
};

export default IssuesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  controls: { paddingHorizontal: 16 },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  selectAllText: { fontSize: 13, fontWeight: "500" },
  list: { padding: 16, paddingTop: 0 },
  issueCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  issueContent: { flex: 1 },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  issueKey: { fontSize: 12, fontFamily: "monospace", fontWeight: "600" },
  issueSummary: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  issueDesc: { fontSize: 12, marginTop: 4 },
});
