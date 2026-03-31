import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ propostas: 0, avaliacoes: 0, mediaAvaliacoes: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => { loadUserData(); }, []),
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await api.getMe();
      if (userData) {
        setUser(userData);
        if (userData.tipo_usuario === "artista") {
          const [propostasRes, avaliacoesRes] = await Promise.all([
            api.getPropostasRecebidas(),
            api.getAvaliacoes(userData.id),
          ]);
          setStats({
            propostas: propostasRes.length || 0,
            avaliacoes: avaliacoesRes.avaliacoes?.length || 0,
            mediaAvaliacoes: avaliacoesRes.media || 0,
          });
        } else {
          const propostasRes = await api.getPropostasRecebidas();
          setStats({ propostas: propostasRes.length || 0, avaliacoes: 0, mediaAvaliacoes: 0 });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    router.replace("/login");
  };

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.mutedText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Erro ao carregar perfil</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadUserData}>
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isArtist = user.tipo_usuario === "artista";

  const menuItems = [
    { icon: "time-outline" as const, label: "Histórico", onPress: () => router.push("/history") },
    { icon: "settings-outline" as const, label: "Configurações", onPress: () => router.push("/settings") },
    { icon: "help-circle-outline" as const, label: "Ajuda", onPress: () => {} },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadUserData(); setRefreshing(false); }} tintColor="#EC4899" colors={["#EC4899"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.roleDot, isArtist ? styles.roleDotArtist : styles.roleDotContractor]} />
            </View>

            {/* Edit button */}
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/edit-profile")}>
              <Ionicons name="pencil-outline" size={14} color="#E4E4E7" />
              <Text style={styles.editBtnText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Name + role */}
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{isArtist ? "Artista" : "Contratante"}</Text>

          {/* Bio */}
          {user.descricao ? (
            <Text style={styles.bio}>{user.descricao}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              <Text style={styles.bioEmpty}>+ Adicionar bio</Text>
            </TouchableOpacity>
          )}

          {/* Metadata (LinkedIn style) */}
          <View style={styles.metaList}>
            {(user.cidade || user.estado) && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#71717A" />
                <Text style={styles.metaText}>{[user.cidade, user.estado].filter(Boolean).join(", ")}</Text>
              </View>
            )}
            {isArtist && user.genero_musical && (
              <View style={styles.metaItem}>
                <Ionicons name="musical-note-outline" size={14} color="#71717A" />
                <Text style={styles.metaText}>{user.genero_musical}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="mail-outline" size={14} color="#71717A" />
              <Text style={styles.metaText}>{user.email}</Text>
            </View>
            {user.telefone && (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={14} color="#71717A" />
                <Text style={styles.metaText}>{user.telefone}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.propostas}</Text>
              <Text style={styles.statLabel}>{isArtist ? "Propostas" : "Enviadas"}</Text>
            </View>
            {isArtist && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.avaliacoes}</Text>
                  <Text style={styles.statLabel}>Avaliações</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stats.mediaAvaliacoes > 0 ? Number(stats.mediaAvaliacoes).toFixed(1) : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Nota</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Menu */}
        {menuItems.map((item, i) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
            <Ionicons name={item.icon} size={20} color="#A1A1AA" />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#3F3F46" />
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  mutedText: { color: "#52525B", fontSize: 14 },
  errorText: { color: "#EF4444", fontSize: 15, marginBottom: 12 },
  retryBtn: { backgroundColor: "#EC4899", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { color: "#FFF", fontWeight: "700" },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  roleDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#000",
  },
  roleDotArtist: { backgroundColor: "#EC4899" },
  roleDotContractor: { backgroundColor: "#8B5CF6" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 0.5,
    borderColor: "#3F3F46",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: { color: "#E4E4E7", fontSize: 13, fontWeight: "600" },

  name: { color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 2 },
  role: { color: "#71717A", fontSize: 14, marginBottom: 10 },
  bio: { color: "#A1A1AA", fontSize: 14, lineHeight: 21, marginBottom: 12 },
  bioEmpty: { color: "#EC4899", fontSize: 14, marginBottom: 12 },

  // Metadata
  metaList: { gap: 6, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#71717A", fontSize: 13 },

  // Stats
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#1A1A1A",
  },
  statItem: { alignItems: "center", paddingHorizontal: 20 },
  statNumber: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#52525B", fontSize: 11, marginTop: 2 },
  statDivider: { width: 0.5, height: 28, backgroundColor: "#1A1A1A" },

  divider: { height: 0.5, backgroundColor: "#1A1A1A", marginVertical: 4 },

  // Menu
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#111",
  },
  menuLabel: { flex: 1, color: "#E4E4E7", fontSize: 15 },

  // Logout
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  logoutText: { color: "#EF4444", fontSize: 15 },
});
