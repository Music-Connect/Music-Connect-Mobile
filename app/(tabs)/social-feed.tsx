import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { Post, StoryGroup, Usuario } from "@/services/api";
import PostCard from "@/components/PostCard";
import StoryCarousel from "@/components/StoryCarousel";

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

  // Story creation
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyUrl, setStoryUrl] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []),
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userData, feedData, storiesData] = await Promise.all([
        api.getMe(),
        api.getFeed({ limit: 15 }),
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
      const result = await api.getFeed({ cursor, limit: 15 });
      setPosts([...posts, ...result.posts]);
      setCursor(result.meta.nextCursor);
      setHasMore(result.meta.hasMore);
    } catch {}
    setLoadingMore(false);
  };

  const handleDeletePost = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  const handleCreateStory = async () => {
    if (!storyUrl.trim()) return;
    try {
      await api.createStory({ midia_url: storyUrl.trim() });
      setStoryUrl("");
      setShowStoryModal(false);
      const newStories = await api.getStories().catch(() => []);
      setStories(newStories);
    } catch {
      Alert.alert("Erro", "Erro ao criar story");
    }
  };

  const handleOpenStory = (index: number) => {
    // For now, just mark as viewed - full viewer can be added later
    const group = stories[index];
    if (group) {
      group.stories.forEach((s) => {
        if (!s.visto) api.visualizarStory(s.id).catch(() => {});
      });
    }
    Alert.alert(
      group.user.name,
      `${group.stories.length} story(ies)`,
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
        onCreateStory={() => setShowStoryModal(true)}
      />

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
            onComment={() => {
              // TODO: navigate to comment screen or open modal
            }}
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

      {/* Story Modal */}
      <Modal visible={showStoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Story</Text>
            <TextInput
              value={storyUrl}
              onChangeText={setStoryUrl}
              placeholder="URL da imagem ou vídeo"
              placeholderTextColor="#52525B"
              style={styles.modalInput}
            />
            <Text style={styles.modalHint}>Expira automaticamente em 24 horas</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowStoryModal(false);
                  setStoryUrl("");
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateStory}
                disabled={!storyUrl.trim()}
                style={[styles.modalPublishBtn, !storyUrl.trim() && { opacity: 0.3 }]}
              >
                <Text style={styles.modalPublishText}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#18181B",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(63,63,70,0.4)",
  },
  modalTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  modalInput: {
    color: "#FFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(63,63,70,0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(39,39,42,0.3)",
    marginBottom: 8,
  },
  modalHint: { color: "#52525B", fontSize: 10, marginBottom: 20 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  cancelText: { color: "#A1A1AA", fontSize: 14, fontWeight: "600" },
  modalPublishBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalPublishText: { color: "#000", fontSize: 13, fontWeight: "700" },
});
