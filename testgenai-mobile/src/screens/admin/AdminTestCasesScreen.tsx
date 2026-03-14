import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useAdminStore } from "../../store/adminStore";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { AdminTestCase, Test } from "../../types/jira";
import { Card } from "../../components/ui/Card";
import { LoadingView, ErrorView, EmptyView } from "../../components/ui/StateViews";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";

type Props = {
  navigation?: NativeStackNavigationProp<any>;
  route?: RouteProp<RootStackParamList, "AdminTestCases">;
};

type Section = {
  title: string;
  projectKey: string;
  data: AdminTestCase[];
};

const AdminTestCasesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { testCases, setTestCases, selectedProjectKey, setSelectedProjectKey } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const projectKeyFilter = route?.params?.projectKey || selectedProjectKey || undefined;

  const fetchTestCases = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAdminTestCases(projectKeyFilter);
      setTestCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test cases");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setTestCases, projectKeyFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTestCases();
    }, [fetchTestCases]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTestCases();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group test cases by project
  const sections: Section[] = React.useMemo(() => {
    const grouped = new Map<string, AdminTestCase[]>();
    for (const tc of testCases) {
      const key = tc.projectKey || "Unknown";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tc);
    }
    return Array.from(grouped.entries()).map(([key, data]) => ({
      title: data[0]?.projectName || key,
      projectKey: key,
      data,
    }));
  }, [testCases]);

  if (!isAuthenticated) {
    return (
      <EmptyView
        icon="shield-outline"
        title="Admin Access Required"
        message="Sign in with an admin account to view generated test cases."
        actionLabel="Go to Admin Login"
        onAction={() => navigation?.navigate("Login")}
      />
    );
  }

  if (loading && testCases.length === 0)
    return <LoadingView message="Loading test cases..." />;
  if (error && testCases.length === 0)
    return <ErrorView message={error} onRetry={fetchTestCases} />;

  const totalTests = testCases.reduce((sum, tc) => sum + tc.tests.length, 0);

  const renderTest = (test: Test, index: number) => (
    <View
      key={test.id}
      style={[styles.testItem, { borderLeftColor: colors.primary }]}
    >
      <View style={styles.testHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.typeText, { color: colors.primary }]}>
            {test.type}
          </Text>
        </View>
        {test.method && (
          <View
            style={[
              styles.methodBadge,
              {
                backgroundColor:
                  test.method === "GET"
                    ? colors.success + "15"
                    : test.method === "POST"
                      ? colors.orange + "15"
                      : test.method === "DELETE"
                        ? colors.destructive + "15"
                        : colors.primary + "15",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color:
                  test.method === "GET"
                    ? colors.success
                    : test.method === "POST"
                      ? colors.orange
                      : test.method === "DELETE"
                        ? colors.destructive
                        : colors.primary,
              }}
            >
              {test.method}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.testTitle, { color: colors.text }]}>{test.title}</Text>
      {test.description && (
        <Text style={[styles.testDesc, { color: colors.textSecondary }]}>
          {test.description}
        </Text>
      )}
      {test.url && (
        <Text style={[styles.testUrl, { color: colors.textMuted }]} numberOfLines={1}>
          {test.url}
        </Text>
      )}
      {test.steps.length > 0 && (
        <View style={styles.stepsContainer}>
          {test.steps.map((step, si) => (
            <View key={si} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderTestCase = ({ item }: { item: AdminTestCase }) => {
    const isExpanded = expandedIds.has(item.id);
    return (
      <Card>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
          style={styles.tcHeader}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.tcTitleRow}>
              <View style={[styles.issueBadge, { backgroundColor: colors.orange + "15" }]}>
                <Text style={[styles.issueBadgeText, { color: colors.orange }]}>
                  {item.issueKey}
                </Text>
              </View>
              <View style={[styles.countChip, { backgroundColor: colors.primary + "15" }]}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                  {item.tests.length} tests
                </Text>
              </View>
            </View>
            {item.requirement && (
              <Text
                style={[styles.requirement, { color: colors.textSecondary }]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {item.requirement}
              </Text>
            )}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.testsSection, { borderTopColor: colors.border }]}>
            {item.tests.map(renderTest)}
          </View>
        )}
      </Card>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <View style={[styles.sectionBadge, { backgroundColor: colors.orange + "15" }]}>
        <Ionicons name="folder-outline" size={14} color={colors.orange} />
        <Text style={[styles.sectionTitle, { color: colors.orange }]}>
          {section.projectKey}
        </Text>
      </View>
      <Text style={[styles.sectionName, { color: colors.text }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
        {section.data.length} {section.data.length === 1 ? "case" : "cases"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={[styles.summaryChip, { backgroundColor: colors.orange + "15" }]}>
          <Ionicons name="document-text" size={14} color={colors.orange} />
          <Text style={[styles.summaryText, { color: colors.orange }]}>
            {testCases.length} Cases
          </Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="list" size={14} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            {totalTests} Tests
          </Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: colors.success + "15" }]}>
          <Ionicons name="folder" size={14} color={colors.success} />
          <Text style={[styles.summaryText, { color: colors.success }]}>
            {sections.length} Projects
          </Text>
        </View>
      </View>

      {projectKeyFilter && (
        <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
          <Ionicons name="funnel" size={14} color={colors.orange} />
          <Text style={[styles.filterText, { color: colors.text }]}>
            Filtered: {projectKeyFilter}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (route?.params?.projectKey) {
                navigation?.setParams({ projectKey: undefined });
              }
              setSelectedProjectKey(null);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTestCase}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <EmptyView
            icon="document-text-outline"
            title="No test cases"
            message={
              projectKeyFilter
                ? `No test cases found for project "${projectKeyFilter}"`
                : "No test cases have been generated yet"
            }
          />
        }
      />
    </View>
  );
};

export default AdminTestCasesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  summaryText: { fontSize: 12, fontWeight: "600" },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterText: { flex: 1, fontSize: 13, fontWeight: "500" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700" },
  sectionName: { flex: 1, fontSize: 14, fontWeight: "600" },
  sectionCount: { fontSize: 12 },
  tcHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tcTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  issueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  issueBadgeText: { fontSize: 11, fontWeight: "700" },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requirement: { fontSize: 13, lineHeight: 18 },
  testsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  testItem: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: { fontSize: 10, fontWeight: "700" },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  testDesc: { fontSize: 12, marginBottom: 4 },
  testUrl: { fontSize: 11, marginBottom: 4 },
  stepsContainer: { marginTop: 4 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  stepText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
