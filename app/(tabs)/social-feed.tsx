import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { Post, StoryGroup, Usuario } from "@/services/api";
import PostCard from "@/components/PostCard";
import StoryCarousel from "@/components/StoryCarousel";
import StoryViewer from "@/components/StoryViewer";
import CommentsModal from "@/components/CommentsModal";

type FeedMode = "recente" | "recomendado";
type TipoFiltro = "todos" | "post" | "disponibilidade" | "buscando";

const TIPO_CHIPS: { id: TipoFiltro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "post", label: "Publicações" },
  { id: "disponibilidade", label: "Disponíveis" },
  { id: "buscando", label: "Buscando" },
];

export default function SocialFeedScreen() {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtros
  const [modo, setModo] = useState<FeedMode>("recente");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");

  // Story viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

  // Comments modal
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  // Carrega quando a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Re-fetch só dos posts quando filtros mudam (mantém stories/user em cache)
  useEffect(() => {
    if (loading) return; // primeira carga é feita pelo useFocusEffect
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, tipoFiltro]);

  const fetchFeed = (params: { cursor?: string; limit: number }) => {
    if (modo === "recomendado") {
      return api.getFeedRecomendado(params);
    }
    return api.getFeed({
      ...params,
      tipo: tipoFiltro === "todos" ? undefined : tipoFiltro,
    });
  };

  const loadPosts = async () => {
    try {
      const feedData = await fetchFeed({ limit: 15 });
      setPosts(feedData.posts);
      setCursor(feedData.meta.nextCursor);
      setHasMore(feedData.meta.hasMore);
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userData, feedData, storiesData] = await Promise.all([
        api.getMe(),
        fetchFeed({ limit: 15 }),
        api.getStories().catch(() => []),
      ]);
      setUser(userData);
      setPosts(feedData.posts);
      setCursor(feedData.meta.nextCursor);
      setHasMore(feedData.meta.hasMore);
      setStories(storiesData);
    } catch {}
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchFeed({ cursor, limit: 15 });
      setPosts([...posts, ...result.posts]);
      setCursor(result.meta.nextCursor);
      setHasMore(result.meta.hasMore);
    } catch {}
    setLoadingMore(false);
  };

  const handleDeletePost = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  const handleOpenStory = (index: number) => {
    setViewerGroupIndex(index);
    setViewerOpen(true);
  };

  /** Atualiza hasUnseen localmente sem re-fetch */
  const handleStoryViewed = (groupIndex: number, storyId: string) => {
    setStories((prev) =>
      prev.map((group, gi) => {
        if (gi !== groupIndex) return group;
        const updated = group.stories.map((s) =>
          s.id === storyId ? { ...s, visto: true } : s,
        );
        return { ...group, stories: updated, hasUnseen: updated.some((s) => !s.visto) };
      }),
    );
  };

  const renderHeader = () => (
    <View>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.brandText}>Music Connect</Text>
        <TouchableOpacity onPress={() => router.push("/create-post" as any)}>
          <Ionicons name="add-circle-outline" size={26} color="#EC4899" />
        </TouchableOpacity>
      </View>

      {/* Stories */}
      <StoryCarousel
        stories={stories}
        currentUserId={user?.id}
        onOpenStory={handleOpenStory}
        onCreateStory={() => router.push("/create-story" as any)}
      />

      {/* Toggle modo: Recente ↔ Recomendado */}
      <View style={styles.modoToggle}>
        {(["recente", "recomendado"] as FeedMode[]).map((m) => {
          const active = modo === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setModo(m)}
              style={[styles.modoButton, active && styles.modoButtonActive]}
            >
              <Text style={[styles.modoText, active && styles.modoTextActive]}>
                {m === "recente" ? "Recentes" : "Para você"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chips de tipo — apenas no modo Recente (Recomendado não aceita tipo) */}
      {modo === "recente" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {TIPO_CHIPS.map((chip) => {
            const active = tipoFiltro === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setTipoFiltro(chip.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="newspaper-outline" size={48} color="#3F3F46" />
      <Text style={styles.emptyTitle}>Nenhuma publicação</Text>
      <Text style={styles.emptyText}>Seja o primeiro a compartilhar algo!</Text>
      <TouchableOpacity
        onPress={() => router.push("/create-post" as any)}
        style={styles.emptyBtn}
      >
        <Text style={styles.emptyBtnText}>Criar publicação</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Carregando...</Text>
        </View>
      );
    }
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Você viu tudo por enquanto</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onDelete={handleDeletePost}
            onComment={(p) => setCommentsPostId(p.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EC4899"
            colors={["#EC4899"]}
          />
        }
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/create-post" as any)}
        style={styles.fab}
      >
        <Ionicons name="create-outline" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Story Viewer */}
      <Modal
        visible={viewerOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setViewerOpen(false)}
      >
        <StoryViewer
          stories={stories}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerOpen(false)}
          onViewed={handleStoryViewed}
        />
      </Modal>

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId ?? ""}
        currentUserId={user?.id}
        onClose={() => setCommentsPostId(null)}
        onCountChange={(delta) =>
          setPosts((prev) =>
            prev.map((p) =>
              p.id === commentsPostId
                ? { ...p, comentarios_count: Math.max(0, (p.comentarios_count ?? 0) + delta) }
                : p,
            ),
          )
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#EC4899",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(63,63,70,0.3)",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  modoToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: "#18181B",
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  modoButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  modoButtonActive: {
    backgroundColor: "#27272A",
  },
  modoText: {
    color: "#71717A",
    fontSize: 13,
    fontWeight: "600",
  },
  modoTextActive: {
    color: "#EC4899",
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272A",
    backgroundColor: "#18181B",
  },
  chipActive: {
    backgroundColor: "rgba(236,72,153,0.15)",
    borderColor: "#EC4899",
  },
  chipText: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#EC4899",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#71717A", fontSize: 13 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: "#EC4899",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  footer: { padding: 20, alignItems: "center" },
  footerText: { color: "#52525B", fontSize: 12 },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
