import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../services/api";
import { PostmanCollection } from "../../types/jira";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Button } from "../../components/ui/Button";
import Toast from "react-native-toast-message";

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<
    { CollectionPicker: { issueDescriptions: string[] } },
    "CollectionPicker"
  >;
};

/**
 * Screen to pick a Postman collection and trigger test case generation.
 * Replaces the web modal PostmanCollectionPicker + generate flow.
 */
const CollectionPickerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { issueDescriptions } = route.params;
  const { colors } = useTheme();
  const [collections, setCollections] = useState<PostmanCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getPostmanCollections();
        setCollections(res.collections || []);
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load collections" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    try {
      await api.generateTestcases(selectedId, issueDescriptions);
      Toast.show({ type: "success", text1: "Test cases generated!" });
      navigation.navigate("CollectionDetail", { collectionId: selectedId });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to generate test cases" });
    } finally {
      setGenerating(false);
    }
  };

  const renderItem = ({ item }: { item: PostmanCollection }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelectedId(item.id)}
        style={[
          styles.item,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.primary + "08" : colors.card,
          },
        ]}
      >
        <Ionicons
          name={isSelected ? "radio-button-on" : "radio-button-off"}
          size={20}
          color={isSelected ? colors.primary : colors.textMuted}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.text }]}>
            {item.name}
          </Text>
          {item.createdAt && (
            <Text style={[styles.itemDate, { color: colors.textMuted }]}>
              {item.createdAt}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Select Collection
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {issueDescriptions.length} issue
          {issueDescriptions.length !== 1 ? "s" : ""} selected for generation
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>
            No collections available.
          </Text>
          <Button
            title="Connect Postman"
            onPress={() => {
              navigation.goBack();
              navigation.navigate("Dashboard");
            }}
            variant="outline"
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {selectedId && (
        <View style={[styles.footer, { borderColor: colors.border }]}>
          <Button
            title="Generate Test Cases"
            onPress={handleGenerate}
            loading={generating}
            variant="primary"
            size="lg"
            icon={
              !generating ? (
                <Ionicons
                  name="flash"
                  size={16}
                  color={colors.primaryForeground}
                />
              ) : undefined
            }
          />
        </View>
      )}
    </View>
  );
};

export default CollectionPickerScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingTop: 0 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemDate: { fontSize: 11, marginTop: 2 },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
});
