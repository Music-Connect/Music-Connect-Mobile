import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";

interface Work {
  id_proposta: string | number;
  titulo: string;
  descricao?: string;
  data?: string;
  local?: string;
  valor_oferecido?: number;
  contratante_nome?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ propostas: 0, avaliacoes: 0, mediaAvaliacoes: 0 });
  const [works, setWorks] = useState<Work[]>([]);
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
          const completed = (propostasRes as any[])
            .filter((p) => p.status === "concluida")
            .map((p) => ({
              id_proposta: p.id_proposta,
              titulo: p.titulo || "Sem título",
              descricao: p.descricao,
              data: p.data,
              local: p.local,
              valor_oferecido: p.valor_oferecido,
              contratante_nome: p.contratante_nome || p.contratante,
            }));
          setWorks(completed);
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
        <Text style={styles.mutedText}>Carregando...</Text>
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

  const socialLinks = [
    user.spotify_url && { icon: "musical-notes-outline" as const, label: "Spotify", url: user.spotify_url, color: "#1DB954" },
    user.instagram_url && { icon: "logo-instagram" as const, label: "Instagram", url: user.instagram_url, color: "#E1306C" },
    user.youtube_url && { icon: "logo-youtube" as const, label: "YouTube", url: user.youtube_url, color: "#FF0000" },
  ].filter(Boolean) as { icon: any; label: string; url: string; color: string }[];

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadUserData(); setRefreshing(false); }}
            tintColor="#EC4899"
            colors={["#EC4899"]}
          />
        }
      >
        {/* Banner area */}
        <View style={[styles.banner, { paddingTop: insets.top }]}>
          <View style={styles.bannerInner} />
        </View>

        {/* Profile section */}
        <View style={styles.profileSection}>
          {/* Avatar row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={[styles.roleDot, isArtist ? styles.roleDotArtist : styles.roleDotContractor]} />
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push("/edit-profile")}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.roleLabel}>{isArtist ? "Artista" : "Contratante"}</Text>

          {/* Bio */}
          {user.descricao ? (
            <Text style={styles.bio}>{user.descricao}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push("/edit-profile")} activeOpacity={0.7}>
              <Text style={styles.bioPlaceholder}>+ Adicionar bio</Text>
            </TouchableOpacity>
          )}

          {/* Meta info */}
          <View style={styles.metaList}>
            {(user.cidade || user.estado) && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color="#52525B" />
                <Text style={styles.metaText}>
                  {[user.cidade, user.estado].filter(Boolean).join(", ")}
                </Text>
              </View>
            )}
            {isArtist && user.genero_musical && (
              <View style={styles.metaItem}>
                <Ionicons name="musical-note-outline" size={13} color="#52525B" />
                <Text style={styles.metaText}>{user.genero_musical}</Text>
              </View>
            )}
            {user.telefone && (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={13} color="#52525B" />
                <Text style={styles.metaText}>{user.telefone}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="mail-outline" size={13} color="#52525B" />
              <Text style={styles.metaText}>{user.email}</Text>
            </View>
          </View>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <View style={styles.socialRow}>
              {socialLinks.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.socialBtn}
                  onPress={() => Linking.openURL(link.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={link.icon} size={16} color={link.color} />
                  <Text style={[styles.socialBtnText, { color: link.color }]}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
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
                  <Text style={styles.statLabel}>Nota média</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Portfolio section — artists only */}
        {isArtist && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Portfólio</Text>
                {works.length > 0 && (
                  <Text style={styles.sectionCount}>{works.length}</Text>
                )}
              </View>

              {works.length === 0 ? (
                <View style={styles.portfolioEmpty}>
                  <Ionicons name="musical-notes-outline" size={28} color="#3F3F46" />
                  <Text style={styles.portfolioEmptyText}>Nenhum trabalho concluído ainda</Text>
                </View>
              ) : (
                works.map((work, index) => (
                  <TouchableOpacity
                    key={work.id_proposta}
                    style={[styles.workRow, index < works.length - 1 && styles.workRowBorder]}
                    onPress={() => router.push(`/proposal/${work.id_proposta}`)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.workLeft}>
                      <View style={styles.workIconBox}>
                        <Ionicons name="musical-note" size={16} color="#EC4899" />
                      </View>
                    </View>
                    <View style={styles.workContent}>
                      <View style={styles.workTopRow}>
                        <Text style={styles.workTitle} numberOfLines={1}>{work.titulo}</Text>
                        {work.valor_oferecido != null && (
                          <Text style={styles.workValue}>
                            R$ {Number(work.valor_oferecido).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </Text>
                        )}
                      </View>
                      <View style={styles.workMeta}>
                        {work.contratante_nome && (
                          <View style={styles.workMetaItem}>
                            <Ionicons name="person-outline" size={11} color="#52525B" />
                            <Text style={styles.workMetaText}>{work.contratante_nome}</Text>
                          </View>
                        )}
                        {work.data && (
                          <View style={styles.workMetaItem}>
                            <Ionicons name="calendar-outline" size={11} color="#52525B" />
                            <Text style={styles.workMetaText}>{work.data}</Text>
                          </View>
                        )}
                        {work.local && (
                          <View style={styles.workMetaItem}>
                            <Ionicons name="location-outline" size={11} color="#52525B" />
                            <Text style={styles.workMetaText}>{work.local}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#27272A" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={18} color="#71717A" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color="#27272A" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
          activeOpacity={0.6}
        >
          <View style={[styles.menuIconWrap, styles.menuIconRed]}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </View>
          <Text style={styles.logoutLabel}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 80 }} />
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

  // Banner
  banner: { backgroundColor: "#0A0A0A" },
  bannerInner: {
    height: 90,
    backgroundColor: "#111",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1A1A1A",
  },

  // Profile section
  profileSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginTop: -20,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  avatarText: { color: "#FFF", fontSize: 30, fontWeight: "800" },
  roleDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#000",
  },
  roleDotArtist: { backgroundColor: "#EC4899" },
  roleDotContractor: { backgroundColor: "#8B5CF6" },
  editBtn: {
    borderWidth: 0.5,
    borderColor: "#3F3F46",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  editBtnText: { color: "#E4E4E7", fontSize: 13, fontWeight: "600" },

  name: { color: "#FFF", fontSize: 21, fontWeight: "800", letterSpacing: -0.3, marginBottom: 2 },
  roleLabel: { color: "#52525B", fontSize: 14, marginBottom: 10 },
  bio: { color: "#A1A1AA", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bioPlaceholder: { color: "#EC4899", fontSize: 14, marginBottom: 12 },

  // Meta
  metaList: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#52525B", fontSize: 13 },

  // Social
  socialRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderColor: "#27272A",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  socialBtnText: { fontSize: 12, fontWeight: "600" },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#1A1A1A",
  },
  statItem: { paddingRight: 24 },
  statNumber: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  statLabel: { color: "#52525B", fontSize: 11, marginTop: 1 },
  statDivider: { width: 0.5, height: 24, backgroundColor: "#1A1A1A", marginRight: 24 },

  divider: { height: 8, backgroundColor: "#0A0A0A", borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#1A1A1A" },

  // Portfolio
  sectionBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  sectionCount: { color: "#52525B", fontSize: 13 },

  portfolioEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  portfolioEmptyText: { color: "#52525B", fontSize: 13 },

  workRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  workRowBorder: { borderBottomWidth: 0.5, borderBottomColor: "#111" },
  workLeft: {},
  workIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(236,72,153,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  workContent: { flex: 1 },
  workTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  workTitle: { flex: 1, color: "#E4E4E7", fontSize: 14, fontWeight: "600" },
  workValue: { color: "#EC4899", fontSize: 13, fontWeight: "700" },
  workMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  workMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  workMetaText: { color: "#52525B", fontSize: 12 },

  // Menu
  menuSection: { paddingHorizontal: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: "#111" },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconRed: { backgroundColor: "rgba(239,68,68,0.1)" },
  menuLabel: { flex: 1, color: "#E4E4E7", fontSize: 15 },

  // Logout
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  logoutLabel: { color: "#EF4444", fontSize: 15 },
});
