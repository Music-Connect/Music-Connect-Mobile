import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";
import FeedProposalCard from "@/components/FeedProposalCard";
import AppHeader from "@/components/AppHeader";
import { Usuario } from "@/services/api";

interface FeedProposal {
  id_proposta: string;
  titulo: string;
  descricao: string;
  valor_oferecido: number;
  status: string;
  data: string;
  hora: string;
  local: string;
  tipo_evento: string;
  contratante_nome: string;
  contratante_id: string;
  duracao_horas?: number;
  publico_esperado?: number;
}

const EVENT_TYPES = [
  "Todos",
  "Casamento",
  "Aniversário",
  "Corporativo",
  "Festival",
  "Bar/Restaurante",
  "Formatura",
];

export default function FeedScreen() {
  const router = useRouter();
  const [proposals, setProposals] = useState<FeedProposal[]>([]);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchLocal, setSearchLocal] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("Todos");

  const isArtist = user?.tipo_usuario === "artista";

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [searchLocal, selectedTipo]),
  );

  const loadData = async () => {
    try {
      const hasToken = await api.hasToken();
      if (!hasToken) { router.replace("/login"); return; }

      setLoading(true);
      const [userRes, feedRes] = await Promise.all([
        api.getMe(),
        api.listarRecomendacoes({
          local: searchLocal || undefined,
          tipo_evento: selectedTipo === "Todos" ? undefined : selectedTipo,
          limit: 20,
          offset: 0,
        }),
      ]);

      if (userRes) setUser(userRes);
      setProposals(feedRes.propostas as unknown as FeedProposal[]);
      setHasMore(feedRes.hasMore || false);
    } catch (error) {
      console.error("Erro ao carregar feed:", error);
      if (error instanceof Error && error.message.includes("Token")) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading) return;
    try {
      const feedRes = await api.listarRecomendacoes({
        local: searchLocal || undefined,
        tipo_evento: selectedTipo === "Todos" ? undefined : selectedTipo,
        limit: 20,
        offset: proposals.length,
      });
      setProposals([...proposals, ...(feedRes.propostas as unknown as FeedProposal[])]);
      setHasMore(feedRes.hasMore || false);
    } catch {}
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="location-outline" size={16} color="#52525B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cidade ou região..."
          placeholderTextColor="#52525B"
          value={searchLocal}
          onChangeText={setSearchLocal}
        />
        {searchLocal.length > 0 && (
          <TouchableOpacity onPress={() => setSearchLocal("")}>
            <Ionicons name="close-circle" size={16} color="#52525B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Event type chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {EVENT_TYPES.map((type) => {
          const active = selectedTipo === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => setSelectedTipo(type)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section title */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {isArtist ? "Oportunidades" : "Propostas"}
        </Text>
        {proposals.length > 0 && (
          <Text style={styles.sectionCount}>{proposals.length}</Text>
        )}
      </View>
    </View>
  );

  if (loading && proposals.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!loading && !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Não autenticado</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace("/login")}>
          <Text style={styles.loginBtnText}>Fazer login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader user={user} showSearch={false} showNotifications />
      <FlatList
        data={proposals}
        renderItem={({ item }) => (
          <FeedProposalCard
            id={item.id_proposta}
            titulo={item.titulo}
            descricao={item.descricao}
            valor={item.valor_oferecido}
            data={item.data}
            hora={item.hora}
            local={item.local}
            tipoEvento={item.tipo_evento}
            contratanteNome={item.contratante_nome}
            duracao={item.duracao_horas}
            publicoEsperado={item.publico_esperado}
            onPress={() => router.push(`/proposal/${item.id_proposta}`)}
          />
        )}
        keyExtractor={(item) => item.id_proposta.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={40} color="#3F3F46" />
              <Text style={styles.emptyTitle}>Nenhuma proposta</Text>
              <Text style={styles.emptyText}>Tente ajustar os filtros</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#EC4899" colors={["#EC4899"]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={proposals.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#52525B", fontSize: 14 },
  loginBtn: { marginTop: 12, backgroundColor: "#EC4899", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  loginBtnText: { color: "#FFF", fontWeight: "700" },

  headerSection: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1A1A1A",
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 14,
    padding: 0,
  },

  // Chips
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#111",
  },
  chipActive: {
    backgroundColor: "#EC4899",
    borderColor: "#EC4899",
  },
  chipText: { color: "#71717A", fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },

  // Section title
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
  },
  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  sectionCount: {
    color: "#52525B",
    fontSize: 13,
  },

  // Empty
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { color: "#E4E4E7", fontSize: 15, fontWeight: "600" },
  emptyText: { color: "#52525B", fontSize: 13 },
});
