import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";
import { Usuario } from "@/services/api";

interface Proposal {
  id_proposta: number;
  titulo?: string;
  descricao?: string;
  valor_oferecido?: number;
  status: "pendente" | "aceita" | "rejeitada" | "recusada" | "concluida";
  data?: string;
  hora?: string;
  local?: string;
  tipo_evento?: string;
  contratante_nome?: string;
  artista_nome?: string;
}

const STATUS_FILTERS = ["Todas", "Pendentes", "Aceitas", "Recusadas", "Concluídas"];

const STATUS_MAP: Record<string, string> = {
  Pendentes: "pendente",
  Aceitas: "aceita",
  Recusadas: "recusada",
  Concluídas: "concluida",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  rejeitada: "Recusada",
  recusada: "Recusada",
  concluida: "Concluída",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "#F59E0B",
  aceita: "#22C55E",
  rejeitada: "#EF4444",
  recusada: "#EF4444",
  concluida: "#3B82F6",
};

export default function MinhasPropostasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Proposal[]>([]);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("Todas");

  const isArtist = user?.tipo_usuario === "artista";

  useFocusEffect(
    React.useCallback(() => { loadData(); }, []),
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await api.getMe();
      if (!userRes) { router.replace("/login"); return; }
      setUser(userRes);

      const proposalsRes = userRes.tipo_usuario === "artista"
        ? await api.getPropostasRecebidas()
        : await api.getPropostasEnviadas();

      setAll(proposalsRes as unknown as Proposal[]);
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.atualizarStatusProposta(id, "aceita");
      loadData();
    } catch {}
  };

  const handleReject = async (id: number) => {
    try {
      await api.atualizarStatusProposta(id, "recusada");
      loadData();
    } catch {}
  };

  const filtered = filter === "Todas"
    ? all
    : all.filter((p) => {
        const mapped = STATUS_MAP[filter];
        return p.status === mapped || (mapped === "recusada" && p.status === "rejeitada");
      });

  const renderItem = ({ item, index }: { item: Proposal; index: number }) => {
    const statusColor = STATUS_COLOR[item.status] ?? "#52525B";
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;
    const isPending = item.status === "pendente";
    const isLast = index === filtered.length - 1;

    return (
      <TouchableOpacity
        style={[styles.row, !isLast && styles.rowBorder]}
        onPress={() => router.push(`/proposal/${item.id_proposta}`)}
        activeOpacity={0.6}
      >
        {/* Top: title + badge */}
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.titulo || "Sem título"}</Text>
          <View style={[styles.badge, { borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Value */}
        {item.valor_oferecido != null && (
          <Text style={styles.rowValue}>
            R$ {Number(item.valor_oferecido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </Text>
        )}

        {/* Description */}
        {item.descricao ? (
          <Text style={styles.rowDesc} numberOfLines={2}>{item.descricao}</Text>
        ) : null}

        {/* Meta */}
        <View style={styles.meta}>
          {item.data && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color="#52525B" />
              <Text style={styles.metaText}>{item.data}{item.hora ? ` · ${item.hora}` : ""}</Text>
            </View>
          )}
          {item.local && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#52525B" />
              <Text style={styles.metaText}>{item.local}</Text>
            </View>
          )}
          {(isArtist ? item.contratante_nome : item.artista_nome) && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color="#52525B" />
              <Text style={styles.metaText}>{isArtist ? item.contratante_nome : item.artista_nome}</Text>
            </View>
          )}
        </View>

        {/* Actions (artist, pending only) */}
        {isArtist && isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={(e) => { e.stopPropagation(); handleReject(item.id_proposta); }}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectBtnText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={(e) => { e.stopPropagation(); handleAccept(item.id_proposta); }}
              activeOpacity={0.7}
            >
              <Text style={styles.acceptBtnText}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && all.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.mutedText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>
          {isArtist ? "Propostas recebidas" : "Minhas propostas"}
        </Text>
        {!isArtist && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push("/create-proposal")}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.newBtnText}>Nova</Text>
          </TouchableOpacity>
        )}
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
          const count = f === "Todas"
            ? all.length
            : all.filter((p) => {
                const mapped = STATUS_MAP[f];
                return p.status === mapped || (mapped === "recusada" && p.status === "rejeitada");
              }).length;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
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
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id_proposta.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
            tintColor="#EC4899"
            colors={["#EC4899"]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color="#3F3F46" />
              <Text style={styles.emptyTitle}>Nenhuma proposta</Text>
              <Text style={styles.emptyText}>
                {filter !== "Todas" ? "Tente outro filtro" : isArtist
                  ? "Você ainda não recebeu propostas"
                  : "Crie sua primeira proposta"}
              </Text>
              {!isArtist && filter === "Todas" && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/create-proposal")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyBtnText}>Criar proposta</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  mutedText: { color: "#52525B", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EC4899",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  newBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

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

  rowValue: { color: "#EC4899", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  rowDesc: { color: "#71717A", fontSize: 13, lineHeight: 19, marginBottom: 8 },

  meta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { color: "#52525B", fontSize: 12 },

  // Actions
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  rejectBtn: {
    borderWidth: 0.5,
    borderColor: "#3F3F46",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  rejectBtnText: { color: "#A1A1AA", fontSize: 13, fontWeight: "600" },
  acceptBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  acceptBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // Empty
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { color: "#E4E4E7", fontSize: 15, fontWeight: "600" },
  emptyText: { color: "#52525B", fontSize: 13 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: "#EC4899",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
