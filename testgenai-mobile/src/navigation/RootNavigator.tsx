import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList } from "./types";

import LandingScreen from "../screens/auth/LandingScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import JiraAuthScreen from "../screens/auth/JiraAuthScreen";
import DashboardTabs from "./DashboardTabs";
import IssuesScreen from "../screens/dashboard/IssuesScreen";
import CollectionDetailScreen from "../screens/postman/CollectionDetailScreen";
import CollectionPickerScreen from "../screens/postman/CollectionPickerScreen";
import UserManagementScreen from "../screens/admin/UserManagementScreen";
import AdminTestCasesScreen from "../screens/admin/AdminTestCasesScreen";
import AdminProjectsScreen from "../screens/admin/AdminProjectsScreen";
import AdminTestSuitesScreen from "../screens/admin/AdminTestSuitesScreen";
import AdminJiraTokensScreen from "../screens/admin/AdminJiraTokensScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigator.
 *
 * Web route mapping:
 *   /                          → Landing
 *   /auth/jira                 → JiraAuth
 *   /dashboard/*               → Dashboard (tabs)
 *   /dashboard/projects/:key   → Issues (stack push)
 *   /dashboard/postman/collection/:id → CollectionDetail (stack push)
 */
const RootNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: "Admin Sign In",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{
            title: "Reset Password",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="JiraAuth"
          component={JiraAuthScreen}
          options={{
            title: "Jira Login",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Issues"
          component={IssuesScreen}
          options={({ route }) => ({
            title: `${(route.params as { projectKey: string }).projectKey} Issues`,
            headerBackTitle: "Projects",
          })}
        />
        <Stack.Screen
          name="CollectionDetail"
          component={CollectionDetailScreen}
          options={{
            title: "Collection Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="CollectionPicker"
          component={CollectionPickerScreen}
          options={{
            title: "Select Collection",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="UserManagement"
          component={UserManagementScreen}
          options={{
            title: "User Management",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="AdminProjects"
          component={AdminProjectsScreen}
          options={{
            title: "Projects",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="AdminTestSuites"
          component={AdminTestSuitesScreen}
          options={{
            title: "Test Suites",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="AdminTestCases"
          component={AdminTestCasesScreen}
          options={{
            title: "Test Cases",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="AdminJiraTokens"
          component={AdminJiraTokensScreen}
          options={{
            title: "Jira Tokens",
            headerBackTitle: "Back",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
