import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Post } from "@/services/api";
import api from "@/services/api";

const { width } = Dimensions.get("window");

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const tipoBadge: Record<string, { label: string; color: string; bg: string }> = {
  disponibilidade: { label: "Disponível", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  buscando: { label: "Buscando Artista", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
};

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onComment?: (post: Post) => void;
}

export default function PostCard({ post, currentUserId, onDelete, onComment }: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.curtiu ?? false);
  const [likeCount, setLikeCount] = useState(post.curtidas_count);

  const isOwner = currentUserId === post.id_autor;
  const tipo = tipoBadge[post.tipo];

  const handleLike = async () => {
    try {
      if (liked) {
        await api.descurtirPost(post.id);
        setLiked(false);
        setLikeCount((c) => c - 1);
      } else {
        await api.curtirPost(post.id);
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await api.deletePost(post.id);
      onDelete?.(post.id);
    } catch {}
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/artist/${post.autor.id}` as any)}
          style={styles.avatar}
        >
          {post.autor.image ? (
            <Image source={{ uri: post.autor.image }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{post.autor.name?.charAt(0).toUpperCase()}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{post.autor.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {post.autor.tipo_usuario === "artista" ? "Artista" : "Contratante"}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
            {post.cidade && (
              <>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="location-outline" size={10} color="#71717A" />
                <Text style={styles.location}>
                  {post.cidade}{post.estado ? `, ${post.estado}` : ""}
                </Text>
              </>
            )}
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.menuBtn}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type badge */}
      {tipo && (
        <View style={[styles.tipoBadge, { backgroundColor: tipo.bg }]}>
          <Text style={[styles.tipoText, { color: tipo.color }]}>{tipo.label}</Text>
        </View>
      )}

      {/* Content */}
      <Text style={styles.content}>{post.conteudo}</Text>

      {/* Tags */}
      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>#{tag}</Text>
          ))}
        </View>
      )}

      {/* Images */}
      {post.imagens.length > 0 && (
        <View style={styles.imageGrid}>
          {post.imagens.slice(0, 4).map((img, i) => (
            <Image
              key={i}
              source={{ uri: img }}
              style={[
                styles.postImage,
                post.imagens.length === 1 && { width: "100%" },
              ]}
            />
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? "#FB7185" : "#71717A"}
          />
          {likeCount > 0 && (
            <Text style={[styles.actionCount, liked && { color: "#FB7185" }]}>
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onComment?.(post)} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={18} color="#71717A" />
          {post.comentarios_count > 0 && (
            <Text style={styles.actionCount}>{post.comentarios_count}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-outline" size={18} color="#71717A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(63,63,70,0.4)",
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  headerInfo: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: "#FFF", fontWeight: "700", fontSize: 13, maxWidth: 160 },
  roleBadge: {
    backgroundColor: "rgba(63,63,70,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: { color: "#A1A1AA", fontSize: 9, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  time: { color: "#71717A", fontSize: 11 },
  dot: { color: "#71717A", fontSize: 11 },
  location: { color: "#71717A", fontSize: 10 },
  menuBtn: { padding: 8 },
  tipoBadge: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tipoText: { fontSize: 11, fontWeight: "600" },
  content: {
    color: "#E4E4E7",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  tag: { color: "#FB7185", fontSize: 12, fontWeight: "500" },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  postImage: {
    width: (width - 52) / 2,
    height: (width - 52) / 2,
    borderRadius: 12,
    backgroundColor: "#27272A",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(63,63,70,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionCount: { color: "#71717A", fontSize: 13, fontWeight: "500" },
});
