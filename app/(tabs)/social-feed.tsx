import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api, { Post, StoryGroup, Usuario } from "@/services/api";
import PostCard from "@/components/PostCard";
import StoryCarousel from "@/components/StoryCarousel";
import StoryViewer from "@/components/StoryViewer";

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

  // Story viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

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
});
