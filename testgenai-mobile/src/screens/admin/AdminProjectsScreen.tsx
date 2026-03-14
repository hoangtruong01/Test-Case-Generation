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
  navigation: NativeStackNavigationProp<RootStackParamList, "AdminProjects">;
};

type AdminProject = {
  id: string;
  projectName: string;
  description: string;
  owner: string;
  totalTestSuites: number;
  createdAt: string;
};

const MOCK_PROJECTS: AdminProject[] = [
  {
    id: "p1",
    projectName: "Postbot Automation",
    description: "Automation testing for Postman collections",
    owner: "khoa",
    totalTestSuites: 8,
    createdAt: "2024-01-10",
  },
  {
    id: "p2",
    projectName: "AI Test Generator",
    description: "Generate API test cases using AI",
    owner: "anna",
    totalTestSuites: 5,
    createdAt: "2024-02-01",
  },
  {
    id: "p3",
    projectName: "Payment Service",
    description: "Payment microservice testing",
    owner: "john",
    totalTestSuites: 12,
    createdAt: "2024-02-18",
  },
  {
    id: "p4",
    projectName: "E-commerce API",
    description: "Test cases for product and order APIs",
    owner: "lucas",
    totalTestSuites: 6,
    createdAt: "2024-03-05",
  },
  {
    id: "p5",
    projectName: "Auth Service",
    description: "Authentication and JWT validation tests",
    owner: "emma",
    totalTestSuites: 4,
    createdAt: "2024-03-11",
  },
  {
    id: "p6",
    projectName: "Notification System",
    description: "Email and push notification tests",
    owner: "sarah",
    totalTestSuites: 7,
    createdAt: "2024-03-20",
  },
];

const AdminProjectsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_PROJECTS;
    return MOCK_PROJECTS.filter(
      (p) =>
        p.projectName.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [search]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Projects</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            Manage all projects in the system
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
          placeholder="Search project, owner or description..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
        />
      </View>

      <View style={[styles.tableHeader, { borderColor: colors.border }]}> 
        <Text style={[styles.th, styles.idCol, { color: colors.textMuted }]}>ID</Text>
        <Text style={[styles.th, styles.nameCol, { color: colors.textMuted }]}>PROJECT</Text>
        <Text style={[styles.th, styles.ownerCol, { color: colors.textMuted }]}>OWNER</Text>
        <Text style={[styles.th, styles.suiteCol, { color: colors.textMuted }]}>SUITES</Text>
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
                {item.projectName}
              </Text>
              <Text style={[styles.cellSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
            <Text style={[styles.ownerCol, styles.cellStrong, { color: colors.text }]}> 
              {item.owner}
            </Text>
            <View style={styles.suiteCol}>
              <View style={[styles.suiteBadge, { backgroundColor: colors.primary + "18" }]}> 
                <Text style={[styles.suiteText, { color: colors.primary }]}> 
                  {item.totalTestSuites}
                </Text>
              </View>
            </View>
          </View>
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
  idCol: { flex: 0.9 },
  nameCol: { flex: 2.4 },
  ownerCol: { flex: 1.1 },
  suiteCol: { flex: 0.9, alignItems: "flex-start" },
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
  suiteBadge: {
    minWidth: 28,
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  suiteText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
