import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { Proposta } from "@/services/api";

type ProposalStatus = "pendente" | "aceita" | "recusada" | "cancelada";

const STATUS_COLOR: Record<ProposalStatus, string> = {
  pendente: "#F59E0B",
  aceita: "#22C55E",
  recusada: "#EF4444",
  cancelada: "#52525B",
};

const STATUS_LABEL: Record<ProposalStatus, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

const STATUS_ICON: Record<ProposalStatus, React.ComponentProps<typeof Ionicons>["name"]> = {
  pendente: "time-outline",
  aceita: "checkmark-circle-outline",
  recusada: "close-circle-outline",
  cancelada: "ban-outline",
};

const STATUS_MSG: Record<ProposalStatus, { title: string; text: string }> = {
  pendente: { title: "Aguardando resposta", text: "O artista ainda não respondeu sua proposta" },
  aceita: { title: "Proposta aceita!", text: "O artista aceitou sua proposta. Entre em contato para confirmar os detalhes" },
  recusada: { title: "Proposta recusada", text: "O artista recusou sua proposta" },
  cancelada: { title: "Proposta cancelada", text: "Você cancelou esta proposta" },
};

export default function ProposalSentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [proposal, setProposal] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (id) loadProposal();
    }, [id]),
  );

  const loadProposal = async () => {
    try {
      setLoading(true);
      const data = await api.getProposta(Number(id));
      setProposal(data);
    } catch (error) {
      console.error("Erro ao carregar proposta:", error);
      Alert.alert("Erro", "Falha ao carregar proposta");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancelar proposta",
      "Tem certeza que deseja cancelar esta proposta? O artista será notificado.",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Cancelar proposta",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const updated = await api.atualizarStatusProposta(Number(id), "cancelada");
              setProposal(updated);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível cancelar a proposta");
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Não informado";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShortDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (!proposal) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Ionicons name="document-text-outline" size={40} color="#3F3F46" />
        <Text style={styles.errorText}>Proposta não encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = (proposal.status ?? "pendente") as ProposalStatus;
  const statusColor = STATUS_COLOR[status] ?? "#52525B";
  const artistaInitial = proposal.artista?.name?.charAt(0).toUpperCase() ?? "A";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Proposta enviada</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + "18" }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={STATUS_ICON[status]} size={12} color="#FFF" />
            <Text style={styles.statusText}>{STATUS_LABEL[status]}</Text>
          </View>
          <Text style={[styles.statusEnvio, { color: statusColor }]}>
            Enviada em {formatShortDate(proposal.created_at)}
          </Text>
        </View>

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.proposalTitle}>{proposal.titulo || "Sem título"}</Text>

          {/* Date + Time */}
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#52525B" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Data do evento</Text>
                <Text style={styles.infoValue}>{formatDate(proposal.data_evento)}</Text>
              </View>
            </View>
            {proposal.hora_evento && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color="#52525B" style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Horário</Text>
                  <Text style={styles.infoValue}>{proposal.hora_evento}</Text>
                </View>
              </View>
            )}
            {proposal.local_evento && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#52525B" style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Local</Text>
                  <Text style={styles.infoValue}>{proposal.local_evento}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Value */}
          <View style={styles.valueBox}>
            <Text style={styles.valueLabel}>Valor da proposta</Text>
            <Text style={styles.valueAmount}>
              R$ {Number(proposal.valor_oferecido ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Description */}
          {proposal.descricao && (
            <View style={styles.descBlock}>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.descText}>{proposal.descricao}</Text>
            </View>
          )}
        </View>

        {/* Artist card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Artista</Text>
          <View style={styles.personRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{artistaInitial}</Text>
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{proposal.artista?.name ?? "Artista"}</Text>
              {proposal.artista?.genero_musical && (
                <View style={styles.genreRow}>
                  <Ionicons name="musical-note-outline" size={12} color="#52525B" />
                  <Text style={styles.genreText}>{proposal.artista.genero_musical}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Status info card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Situação</Text>
          <View style={[styles.statusInfoBox, { backgroundColor: statusColor + "10", borderColor: statusColor + "30" }]}>
            <Ionicons name={STATUS_ICON[status]} size={22} color={statusColor} />
            <View style={styles.statusInfoContent}>
              <Text style={[styles.statusInfoTitle, { color: statusColor }]}>
                {STATUS_MSG[status].title}
              </Text>
              <Text style={styles.statusInfoText}>{STATUS_MSG[status].text}</Text>
            </View>
          </View>

          {/* Artist response message */}
          {proposal.mensagem_resposta && (
            <View style={styles.responseBox}>
              <Text style={styles.responseLabel}>Resposta do artista</Text>
              <Text style={styles.responseText}>"{proposal.mensagem_resposta}"</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {status === "pendente" && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancelar proposta</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backToListBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={16} color="#A1A1AA" />
            <Text style={styles.backToListText}>Voltar para propostas</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center", gap: 12 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#18181B",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  // Error
  errorText: { color: "#71717A", fontSize: 15, marginTop: 8 },
  backBtn: {
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: "#3F3F46",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  backBtnText: { color: "#E4E4E7", fontSize: 14, fontWeight: "600" },

  // Status banner
  statusBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  statusEnvio: { fontSize: 12, fontWeight: "500" },

  // Card
  card: {
    backgroundColor: "#18181B",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  proposalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#71717A", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },

  // Info rows
  infoGroup: { gap: 14, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 11, color: "#52525B", fontWeight: "600", marginBottom: 2 },
  infoValue: { fontSize: 15, color: "#FFF", fontWeight: "600" },

  // Value
  valueBox: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272A",
    marginBottom: 16,
  },
  valueLabel: { fontSize: 11, color: "#52525B", fontWeight: "600", marginBottom: 6 },
  valueAmount: { fontSize: 26, fontWeight: "900", color: "#EC4899" },

  // Description
  descBlock: { borderTopWidth: 0.5, borderTopColor: "#27272A", paddingTop: 14, marginTop: 2 },
  descText: { fontSize: 14, color: "#A1A1AA", lineHeight: 22 },

  // Artist
  personRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3F3F46",
  },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  personInfo: { flex: 1, gap: 4 },
  personName: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  genreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  genreText: { color: "#52525B", fontSize: 12 },

  // Status info
  statusInfoBox: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  statusInfoContent: { flex: 1, gap: 4 },
  statusInfoTitle: { fontSize: 14, fontWeight: "700" },
  statusInfoText: { fontSize: 12, color: "#71717A", lineHeight: 18 },

  // Response
  responseBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#27272A",
    gap: 6,
  },
  responseLabel: { fontSize: 11, color: "#52525B", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  responseText: { fontSize: 14, color: "#A1A1AA", lineHeight: 22, fontStyle: "italic" },

  // Actions
  actions: { marginHorizontal: 16, marginTop: 4, gap: 10 },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 15,
    borderRadius: 14,
  },
  cancelBtnText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
  backToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#18181B",
    borderWidth: 0.5,
    borderColor: "#3F3F46",
    padding: 15,
    borderRadius: 14,
  },
  backToListText: { color: "#A1A1AA", fontSize: 15, fontWeight: "600" },
});
