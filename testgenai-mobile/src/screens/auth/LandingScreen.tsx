import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const features = [
  {
    icon: "git-branch-outline" as const,
    title: "Jira Integration",
    desc: "Connect your Jira projects and fetch issues automatically",
  },
  {
    icon: "globe-outline" as const,
    title: "AI-Powered APIs",
    desc: "Generate REST API endpoints from your user stories using LLM",
  },
  {
    icon: "send-outline" as const,
    title: "Postman Export",
    desc: "Create Postman collections with auto-generated test scripts",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Smart Testing",
    desc: "AI generates comprehensive test scripts like Postbot",
  },
];

const LandingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { isJiraAuthenticated, isPostmanAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isJiraAuthenticated) {
      navigation.navigate("Dashboard");
    } else {
      navigation.navigate("JiraAuth");
    }
  };

  const handleJiraConnect = () => {
    navigation.navigate("JiraAuth");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Ionicons name="flash" size={20} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.logoText, { color: colors.text }]}>TestGenAI</Text>
        <View style={{ flex: 1 }} />
        {isJiraAuthenticated && (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: colors.primary + "15",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              Jira
            </Text>
          </View>
        )}
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            AI-Powered API Test Generation
          </Text>
        </View>

        <Text style={[styles.heroTitle, { color: colors.text }]}>
          From Jira Issues to{" "}
          <Text style={{ color: colors.primary }}>Tested APIs</Text> in Minutes
        </Text>

        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          Connect your Jira, let AI generate API endpoints from your stories,
          and export production-ready Postman collections with smart test
          scripts.
        </Text>

        <View style={styles.heroButtons}>
          {isJiraAuthenticated ? (
            <Button
              title="Go to Dashboard"
              onPress={() => navigation.navigate("Dashboard")}
              variant="primary"
              size="lg"
              icon={
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.primaryForeground}
                />
              }
            />
          ) : (
            <Button
              title="Connect with Jira"
              onPress={handleJiraConnect}
              variant="primary"
              size="lg"
              icon={
                <Ionicons
                  name="log-in-outline"
                  size={16}
                  color={colors.primaryForeground}
                />
              }
            />
          )}
        </View>

        {isJiraAuthenticated && isPostmanAuthenticated && (
          <View
            style={[
              styles.allConnected,
              {
                backgroundColor: colors.success + "15",
                borderColor: colors.success + "30",
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.allConnectedText, { color: colors.success }]}>
              All services connected! You're ready to go.
            </Text>
          </View>
        )}
      </View>

      {/* Features */}
      <View style={styles.features}>
        {features.map((f) => (
          <View
            key={f.title}
            style={[
              styles.featureCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              {f.title}
            </Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              {f.desc}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default LandingScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { fontSize: 20, fontWeight: "700", marginLeft: 8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  hero: { alignItems: "center", marginBottom: 40 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "500" },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
    marginBottom: 24,
  },
  heroButtons: {
    width: "100%",
    gap: 12,
  },
  allConnected: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  allConnectedText: { fontSize: 13, fontWeight: "500" },
  features: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 19 },
});
