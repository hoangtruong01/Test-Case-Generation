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
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminTestSuites">;
};

type Suite = {
  id: string;
  suiteName: string;
  projectName: string;
  totalTestCases: number;
  createdAt: string;
};

const MOCK_SUITES: Suite[] = [
  { id: "s1", suiteName: "User Authentication", projectName: "Auth Service", totalTestCases: 12, createdAt: "2024-03-01" },
  { id: "s2", suiteName: "Payment API", projectName: "Payment Service", totalTestCases: 8, createdAt: "2024-03-05" },
  { id: "s3", suiteName: "Collection Import", projectName: "Postbot Automation", totalTestCases: 6, createdAt: "2024-03-12" },
  { id: "s4", suiteName: "AI Test Generation", projectName: "AI Test Generator", totalTestCases: 15, createdAt: "2024-03-20" },
  { id: "s5", suiteName: "Webhook Testing", projectName: "Postbot Automation", totalTestCases: 9, createdAt: "2024-04-01" },
];

const AdminTestSuitesScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  const projects = useMemo(
    () => Array.from(new Set(MOCK_SUITES.map((s) => s.projectName))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_SUITES.filter((s) => {
      const matchesSearch =
        !q ||
        s.suiteName.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q);
      const matchesProject = projectFilter === "ALL" || s.projectName === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [search, projectFilter]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Test Suites</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            Manage automated test suites
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.primaryForeground} />
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}> 
            New
          </Text>
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
          data={["ALL", ...projects]}
          horizontal
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterContent}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = item === projectFilter;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setProjectFilter(item)}
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

      <View style={[styles.tableHeader, { borderColor: colors.border }]}> 
        <Text style={[styles.th, styles.idCol, { color: colors.textMuted }]}>ID</Text>
        <Text style={[styles.th, styles.nameCol, { color: colors.textMuted }]}>SUITE</Text>
        <Text style={[styles.th, styles.projectCol, { color: colors.textMuted }]}>PROJECT</Text>
        <Text style={[styles.th, styles.countCol, { color: colors.textMuted }]}>CASES</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: colors.border }]}> 
            <Text style={[styles.idCol, styles.cellMono, { color: colors.textMuted }]}>
              {item.id}...
            </Text>
            <View style={styles.nameCol}>
              <Text style={[styles.cellStrong, { color: colors.text }]} numberOfLines={1}>
                {item.suiteName}
              </Text>
              <Text style={[styles.cellSub, { color: colors.textSecondary }]}> 
                {new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            <Text style={[styles.projectCol, styles.cellStrong, { color: colors.text }]} numberOfLines={1}>
              {item.projectName}
            </Text>
            <View style={styles.countCol}>
              <View style={[styles.countBadge, { backgroundColor: colors.primary + "18" }]}> 
                <Text style={[styles.countText, { color: colors.primary }]}> 
                  {item.totalTestCases}
                </Text>
              </View>
            </View>
          </View>
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
  filterRow: { paddingTop: 2, paddingBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  th: { fontSize: 11, fontWeight: "700" },
  idCol: { flex: 0.8 },
  nameCol: { flex: 2.1 },
  projectCol: { flex: 1.7 },
  countCol: { flex: 0.8, alignItems: "flex-start" },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderTopWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  cellMono: {
    fontSize: 11,
    fontWeight: "600",
  },
  cellStrong: {
    fontSize: 12,
    fontWeight: "700",
  },
  cellSub: {
    fontSize: 11,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 28,
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
