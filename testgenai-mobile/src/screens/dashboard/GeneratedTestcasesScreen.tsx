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
import { useAppStore } from "../../store/appStore";
import { RootStackParamList } from "../../navigation/types";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyView } from "../../components/ui/StateViews";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "GeneratedTestcases">;
};

type FlatTest = {
  id: string;
  title: string;
  description?: string;
  steps: string[];
  expected?: string;
  status?: string;
};

const GeneratedTestcasesScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const generatedRaw = useAppStore((s) =>
    s.generatedTestcases as unknown as Record<string, unknown>[],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tests = useMemo<FlatTest[]>(() => {
    const out: FlatTest[] = [];

    for (const row of generatedRaw || []) {
      const groupedTests = Array.isArray(row.tests)
        ? (row.tests as Record<string, unknown>[])
        : null;

      if (groupedTests) {
        for (const test of groupedTests) {
          const id = String(test.test_case_id || test.id || `${out.length}`);
          const steps = Array.isArray(test.test_steps)
            ? (test.test_steps as Record<string, unknown>[])
                .map((s) => String(s.action || "").trim())
                .filter(Boolean)
            : Array.isArray(test.steps)
              ? (test.steps as unknown[]).map((s) => String(s).trim()).filter(Boolean)
              : [];

          out.push({
            id,
            title: String(test.title || test.name || id),
            description:
              typeof test.description === "string" ? test.description : undefined,
            steps,
            expected:
              typeof test.expected_result === "string"
                ? test.expected_result
                : undefined,
            status: typeof test.status === "string" ? test.status : undefined,
          });
        }
        continue;
      }

      const id = String(row.test_case_id || row.id || `${out.length}`);
      const steps = Array.isArray(row.test_steps)
        ? (row.test_steps as Record<string, unknown>[])
            .map((s) => String(s.action || "").trim())
            .filter(Boolean)
        : Array.isArray(row.steps)
          ? (row.steps as unknown[]).map((s) => String(s).trim()).filter(Boolean)
          : [];

      out.push({
        id,
        title: String(row.title || row.name || id),
        description: typeof row.description === "string" ? row.description : undefined,
        steps,
        expected:
          typeof row.expected_result === "string" ? row.expected_result : undefined,
        status: typeof row.status === "string" ? row.status : undefined,
      });
    }

    return out;
  }, [generatedRaw]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTests = useMemo(() => {
    if (selectedIds.size === 0) {
      return tests;
    }
    return tests.filter((t) => selectedIds.has(t.id));
  }, [tests, selectedIds]);

  const handleGenerateEndpoints = () => {
    if (selectedTests.length === 0) return;

    const payload = selectedTests.map((t) => ({
      title: t.title,
      description: t.description || "",
      test_steps: t.steps,
    }));

    navigation.navigate("CollectionPicker", { testcases: payload });
  };

  if (tests.length === 0) {
    return (
      <EmptyView
        icon="document-text-outline"
        title="No Generated Testcases"
        message="Generate testcases from the Issues screen first."
        actionLabel="Go to Projects"
        onAction={() => navigation.navigate("Dashboard")}
      />
    );
  }

  const renderItem = ({ item }: { item: FlatTest }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <Card>
        <TouchableOpacity onPress={() => toggleSelect(item.id)} activeOpacity={0.8}>
          <View style={styles.rowTop}>
            <View style={styles.titleWrap}>
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={20}
                color={isSelected ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            {item.status ? (
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text style={[styles.statusText, { color: colors.primary }]}> 
                  {item.status}
                </Text>
              </View>
            ) : null}
          </View>

          {item.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {item.steps.length > 0 ? (
            <Text style={[styles.steps, { color: colors.textMuted }]} numberOfLines={2}>
              {item.steps.join(" | ")}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Generated Testcases</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}> 
          {selectedTests.length} selected from {tests.length}
        </Text>
      </View>

      <FlatList
        data={tests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <View style={[styles.footer, { borderTopColor: colors.border }]}> 
        <Button
          title="Generate Endpoints"
          onPress={handleGenerateEndpoints}
          variant="primary"
          size="lg"
          icon={<Ionicons name="flash" size={16} color={colors.primaryForeground} />}
        />
      </View>
    </View>
  );
};

export default GeneratedTestcasesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: "600", flex: 1 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  desc: { marginTop: 8, fontSize: 12 },
  steps: { marginTop: 6, fontSize: 11 },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
});
