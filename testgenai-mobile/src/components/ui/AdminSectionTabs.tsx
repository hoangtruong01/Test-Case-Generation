import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

type AdminRouteName =
  | "Dashboard"
  | "UserManagement"
  | "AdminProjects"
  | "AdminTestSuites"
  | "AdminTestCases"
  | "AdminJiraTokens";

interface TabItem {
  key: AdminRouteName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Props {
  active: AdminRouteName;
  navigate: (route: AdminRouteName) => void;
}

const TAB_ITEMS: TabItem[] = [
  { key: "Dashboard", label: "Dashboard", icon: "grid-outline" },
  { key: "UserManagement", label: "Users", icon: "people-outline" },
  { key: "AdminProjects", label: "Projects", icon: "folder-outline" },
  { key: "AdminTestSuites", label: "Test Suites", icon: "albums-outline" },
  { key: "AdminTestCases", label: "Test Cases", icon: "document-text-outline" },
  { key: "AdminJiraTokens", label: "Jira Tokens", icon: "key-outline" },
];

export const AdminSectionTabs: React.FC<Props> = ({ active, navigate }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TAB_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => navigate(item.key)}
              activeOpacity={0.85}
              style={[
                styles.tab,
                {
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary + "18" : colors.card,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={{
                  color: isActive ? colors.primary : colors.textMuted,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
