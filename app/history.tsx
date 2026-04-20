import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { Proposta, Usuario } from "@/services/api";

const PAGE_SIZE = 20;

type StatusFilter = "Todas" | "Aceitas" | "Recusadas" | "Concluídas";

const STATUS_FILTERS: StatusFilter[] = ["Todas", "Aceitas", "Recusadas", "Concluídas"];

const STATUS_MAP: Record<StatusFilter, string[]> = {
  Todas: [],
  Aceitas: ["aceita"],
  Recusadas: ["recusada", "cancelada"],
  Concluídas: ["concluida"],
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
  concluida: "Concluída",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "#F59E0B",
  aceita: "#22C55E",
  recusada: "#EF4444",
  cancelada: "#EF4444",
  concluida: "#3B82F6",
};

interface HistoryEntry extends Proposta {
  _direction: "recebida" | "enviada";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allData, setAllData] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("Todas");
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await api.getMe();
      if (!userRes) { router.replace("/login"); return; }
      setUser(userRes);

      const isArtist = userRes.tipo_usuario === "artista";

      // Fetch based on role — artists receive, contractors send
      // Both roles see their full history from their perspective
      const [received, sent] = await Promise.allSettled([
        isArtist ? api.getPropostasRecebidas() : Promise.resolve([] as Proposta[]),
        isArtist ? Promise.resolve([] as Proposta[]) : api.getPropostasEnviadas(),
      ]);

      const receivedList: HistoryEntry[] = (
        received.status === "fulfilled" ? received.value : []
      ).map((p) => ({ ...p, _direction: "recebida" as const }));

      const sentList: HistoryEntry[] = (
        sent.status === "fulfilled" ? sent.value : []
      ).map((p) => ({ ...p, _direction: "enviada" as const }));

      // Merge, deduplicate by id_proposta, sort newest first
      const seen = new Set<number>();
      const merged = [...receivedList, ...sentList]
        .filter((p) => {
          if (seen.has(p.id_proposta)) return false;
          seen.add(p.id_proposta);
          return true;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllData(merged);
      setPage(1);
      pageRef.current = 1;
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = filter === "Todas"
    ? allData
    : allData.filter((p) => STATUS_MAP[filter].includes(p.status));

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const handleEndReached = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    setPage(nextPage);
    setLoadingMore(false);
  };

  const countFor = (f: StatusFilter) =>
    f === "Todas"
      ? allData.length
      : allData.filter((p) => STATUS_MAP[f].includes(p.status)).length;

  const renderItem = ({ item, index }: { item: HistoryEntry; index: number }) => {
    const statusColor = STATUS_COLOR[item.status] ?? "#52525B";
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;
    const isLast = index === displayed.length - 1;
    const isArtist = user?.tipo_usuario === "artista";
    const otherPerson = isArtist
      ? item.contratante?.name
      : item.artista?.name;

    return (
      <TouchableOpacity
        style={[styles.row, !isLast && styles.rowBorder]}
        onPress={() => router.push(`/proposal/${item.id_proposta}`)}
        activeOpacity={0.6}
      >
        {/* Top: title + badge */}
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.titulo || item.descricao?.slice(0, 40) || "Proposta"}
          </Text>
          <View style={[styles.badge, { borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Value */}
        {item.valor_oferecido != null && (
          <Text style={styles.rowValue}>
            R${" "}
            {Number(item.valor_oferecido).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
        )}

        {/* Description */}
        {item.descricao ? (
          <Text style={styles.rowDesc} numberOfLines={2}>{item.descricao}</Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.meta}>
          {item.data_evento && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={11} color="#52525B" />
              <Text style={styles.metaText}>
                {formatDate(item.data_evento)}
                {item.hora_evento ? ` · ${item.hora_evento}` : ""}
              </Text>
            </View>
          )}
          {item.local_evento && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={11} color="#52525B" />
              <Text style={styles.metaText}>{item.local_evento}</Text>
            </View>
          )}
          {otherPerson && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={11} color="#52525B" />
              <Text style={styles.metaText}>{otherPerson}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && allData.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{allData.length}</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {STATUS_FILTERS.map((f) => {
          const active = filter === f;
          const count = countFor(f);
          return (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setFilter(f);
                setPage(1);
                pageRef.current = 1;
              }}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f}{count > 0 ? ` ${count}` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.divider} />

      <FlatList
        data={displayed}
        renderItem={renderItem}
        keyExtractor={(item) => item.id_proposta.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EC4899"
            colors={["#EC4899"]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#EC4899" />
            </View>
          ) : hasMore ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerText}>{filtered.length - displayed.length} mais</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={44} color="#3F3F46" />
              <Text style={styles.emptyTitle}>Nenhuma proposta</Text>
              <Text style={styles.emptyText}>
                {filter !== "Todas"
                  ? "Tente outro filtro"
                  : "Seu histórico aparecerá aqui"}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={
          displayed.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 20 }
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRight: {
    backgroundColor: "#18181B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerCount: { color: "#71717A", fontSize: 12, fontWeight: "600" },

  // Chips
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#111",
  },
  chipActive: { backgroundColor: "#EC4899", borderColor: "#EC4899" },
  chipText: { color: "#71717A", fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },

  divider: { height: 0.5, backgroundColor: "#1A1A1A" },

  // Row
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: "#1A1A1A" },

  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  rowTitle: { flex: 1, color: "#FFF", fontSize: 15, fontWeight: "700" },

  badge: {
    borderWidth: 0.5,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  rowValue: { color: "#EC4899", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  rowDesc: { color: "#71717A", fontSize: 13, lineHeight: 19, marginBottom: 6 },

  meta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { color: "#52525B", fontSize: 12 },

  // Footer
  footerLoader: { alignItems: "center", paddingVertical: 16 },
  footerText: { color: "#52525B", fontSize: 12 },

  // Empty
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { color: "#E4E4E7", fontSize: 15, fontWeight: "600" },
  emptyText: { color: "#52525B", fontSize: 13 },
});
