import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  RefreshControl,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import {
  LoadingView,
  ErrorView,
  EmptyView,
} from "../../components/ui/StateViews";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { JiraProject } from "../../types/jira";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ProjectsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const { isJiraAuthenticated } = useAuthStore();
  const { projects, setProjects, setSelectedProject } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      setError("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load projects";
      setError(msg);
      Toast.show({ type: "error", text1: "Failed to load projects" });
    }
  }, [setProjects]);

  useEffect(() => {
    if (!isJiraAuthenticated) {
      setLoading(false);
      return;
    }
    if (projects.length > 0) {
      setLoading(false);
      return;
    }
    fetchProjects().finally(() => setLoading(false));
  }, [isJiraAuthenticated, projects.length, fetchProjects]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleSelect = (project: JiraProject) => {
    setSelectedProject(project);
    navigation.navigate("Issues", { projectKey: project.key });
  };

  if (!isJiraAuthenticated) {
    return (
      <EmptyView
        icon="log-in-outline"
        title="Authentication Required"
        message="Please log in to Jira to access your projects and generate API endpoints."
        actionLabel="Login to Jira"
        onAction={() => navigation.navigate("JiraAuth")}
      />
    );
  }

  if (loading) return <LoadingView message="Loading projects..." />;

  if (error) {
    return (
      <ErrorView
        title="Failed to Load Projects"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError("");
          fetchProjects().finally(() => setLoading(false));
        }}
        onReAuth={() => navigation.navigate("JiraAuth")}
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyView
        icon="folder-open-outline"
        title="No Projects Found"
        message="No Jira projects available. Make sure your account has access to at least one project."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  const renderProject = ({ item }: { item: JiraProject }) => (
    <Card onPress={() => handleSelect(item)}>
      <View style={styles.projectRow}>
        <View
          style={[
            styles.projectIcon,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          {item.avatarUrls?.["48x48"] ? (
            <Image
              source={{ uri: item.avatarUrls["48x48"] }}
              style={styles.avatar}
            />
          ) : (
            <Ionicons name="folder-outline" size={22} color={colors.primary} />
          )}
        </View>
        <View style={styles.projectInfo}>
          <Text style={[styles.projectName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.projectKey, { color: colors.textSecondary }]}>
            {item.key}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.notice,
          {
            borderColor: colors.orange + "45",
            backgroundColor: colors.orange + "12",
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={16} color={colors.orange} />
        <Text style={[styles.noticeText, { color: colors.orange }]}>
          Preferred flow from web: Postman Flow (workspace {"->"} collection {"->"}
          testcases {"->"} export).
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Projects</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

export default ProjectsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: { flex: 1, fontSize: 12, fontWeight: "600" },
  headerRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 4 },
  list: { padding: 16, paddingTop: 8 },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 28, height: 28, borderRadius: 4 },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: "600" },
  projectKey: { fontSize: 12, marginTop: 2, fontFamily: "monospace" },
});
