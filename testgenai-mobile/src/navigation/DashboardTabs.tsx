import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { TabParamList } from "./types";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminProjectsScreen from "../screens/admin/AdminProjectsScreen";
import AdminTestCasesScreen from "../screens/admin/AdminTestCasesScreen";
import UserManagementScreen from "../screens/admin/UserManagementScreen";
import ProjectsScreen from "../screens/dashboard/ProjectsScreen";
import PostmanScreen from "../screens/postman/PostmanScreen";
import SettingsScreen from "../screens/dashboard/SettingsScreen";

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Mobile bottom navigation.
 * Admin users get 5 primary tabs:
 *   - Dashboard
 *   - Projects
 *   - Test Cases
 *   - Users
 *   - Settings
 */
const DashboardTabs: React.FC = () => {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      {isAuthenticated ? (
        <>
          <Tab.Screen
            name="DashboardTab"
            component={AdminDashboardScreen}
            options={{
              tabBarLabel: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="ProjectsTab"
            component={AdminProjectsScreen}
            options={{
              tabBarLabel: "Projects",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="folder-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="TestCasesTab"
            component={AdminTestCasesScreen}
            options={{
              tabBarLabel: "Test Cases",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="document-text-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="UsersTab"
            component={UserManagementScreen}
            options={{
              tabBarLabel: "Users",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsScreen}
            options={{
              tabBarLabel: "Settings",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="ProjectsTab"
            component={ProjectsScreen}
            options={{
              tabBarLabel: "Projects",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="folder-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="TestCasesTab"
            component={PostmanScreen}
            options={{
              tabBarLabel: "Postman",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="send-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsScreen}
            options={{
              tabBarLabel: "Settings",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

export default DashboardTabs;
