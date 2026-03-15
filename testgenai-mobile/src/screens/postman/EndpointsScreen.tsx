import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../services/api";
import { PostmanCollection } from "../../types/jira";
import { TextInput } from "../../components/ui/TextInput";
import { LoadingView, EmptyView } from "../../components/ui/StateViews";

type EndpointItem = {
  id: string;
  name: string;
  method: string;
  url: string;
  description?: string;
};

const methodColor = (method: string) => {
  const upper = method.toUpperCase();
  if (upper === "GET") return "#22c55e";
  if (upper === "POST") return "#f59e0b";
  if (upper === "PUT" || upper === "PATCH") return "#3b82f6";
  if (upper === "DELETE") return "#ef4444";
  return "#64748b";
};

const resolveUrl = (raw: unknown): string => {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw !== "object") return String(raw);

  const url = raw as Record<string, unknown>;
  if (typeof url.raw === "string") return url.raw;

  const host = Array.isArray(url.host)
    ? url.host.map((p) => String(p)).join(".")
    : "";
  const path = Array.isArray(url.path)
    ? url.path.map((p) => String(p)).join("/")
    : "";

  if (host && path) return `${host}/${path}`;
  return host || path;
};

const EndpointsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [collections, setCollections] = useState<PostmanCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    null,
  );
  const [requests, setRequests] = useState<EndpointItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollections = async () => {
    try {
      const res = await api.getPostmanCollections();
      const next = res.collections || [];
      setCollections(next);

      if (!selectedCollectionId && next.length > 0) {
        setSelectedCollectionId(next[0].id);
      }
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchRequests = async (collectionId: string) => {
    setLoadingRequests(true);
    try {
      const res = await api.getPostmanRequests(collectionId);
      const raw = res.requests || [];
      const mapped = raw.map((r: Record<string, unknown>, index) => {
        const req = (r.request || {}) as Record<string, unknown>;
        const id = String(r.id || r.requestId || `req-${index}`);
        return {
          id,
          name: String(r.name || `Request ${index + 1}`),
          method: String(req.method || "GET").toUpperCase(),
          url: resolveUrl(req.url),
          description:
            typeof req.description === "string" ? req.description : undefined,
        };
      });
      setRequests(mapped);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollectionId) {
      fetchRequests(selectedCollectionId);
    }
  }, [selectedCollectionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollections();
    if (selectedCollectionId) {
      await fetchRequests(selectedCollectionId);
    }
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q),
    );
  }, [requests, search]);

  if (loadingCollections) return <LoadingView message="Loading collections..." />;

  if (collections.length === 0) {
    return (
      <EmptyView
        icon="globe-outline"
        title="No Collections"
        message="Connect Postman first to browse endpoints."
      />
    );
  }

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Endpoints</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
          {selectedCollection?.name || "Select collection"}
        </Text>
      </View>

      <FlatList
        data={collections}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collectionsRow}
        renderItem={({ item }) => {
          const active = item.id === selectedCollectionId;
          return (
            <TouchableOpacity
              onPress={() => setSelectedCollectionId(item.id)}
              style={[
                styles.collectionChip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + "12" : colors.card,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.text,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search endpoints..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
        />
      </View>

      {loadingRequests ? (
        <LoadingView message="Loading endpoints..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.endpointCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.endpointTop}>
                <View
                  style={[
                    styles.methodBadge,
                    { backgroundColor: methodColor(item.method) + "22" },
                  ]}
                >
                  <Text style={[styles.methodText, { color: methodColor(item.method) }]}>
                    {item.method}
                  </Text>
                </View>
                <Text style={[styles.endpointName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={[styles.endpointUrl, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.url || "No URL"}
              </Text>
              {item.description ? (
                <Text style={[styles.endpointDesc, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="globe-outline"
              title="No Endpoints"
              message="No requests found in this collection."
            />
          }
        />
      )}
    </View>
  );
};

export default EndpointsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  collectionsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  collectionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchWrap: { paddingHorizontal: 16, paddingTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  endpointCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  endpointTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  methodBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  methodText: { fontSize: 10, fontWeight: "800" },
  endpointName: { flex: 1, fontSize: 13, fontWeight: "700" },
  endpointUrl: { fontSize: 12, lineHeight: 18 },
  endpointDesc: { marginTop: 4, fontSize: 11 },
});
