import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
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
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const tipoBadge: Record<string, { label: string; color: string }> = {
  disponibilidade: { label: "Disponível", color: "#34D399" },
  buscando: { label: "Buscando Artista", color: "#FBBF24" },
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
  const imageWidth = (width - 32 - 48 - 12) / 2; // account for left column + gap

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

  const handleShare = async () => {
    try {
      const tipoLabel = tipo?.label ? `[${tipo.label}] ` : "";
      const localLine = post.cidade
        ? `📍 ${post.cidade}${post.estado ? `, ${post.estado}` : ""}\n\n`
        : "";
      const preview =
        post.conteudo.length > 200
          ? post.conteudo.slice(0, 200) + "…"
          : post.conteudo;
      await Share.share({
        message: `🎵 ${tipoLabel}${post.autor.name} no Music Connect\n\n${preview}\n\n${localLine}Baixe o app para conferir.`,
        title: `${post.autor.name} no Music Connect`,
      });
    } catch (error) {
      console.error("Erro ao compartilhar post:", error);
    }
  };

  return (
    <View style={styles.row}>
      {/* Left column: Avatar + thread line */}
      <View style={styles.leftCol}>
        <TouchableOpacity
          onPress={() => router.push(`/artist/${post.autor.id}` as any)}
          activeOpacity={0.8}
        >
          {post.autor.image ? (
            <Image source={{ uri: post.autor.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {post.autor.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Right column: all content */}
      <View style={styles.rightCol}>
        {/* Name row */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {post.autor.name}
          </Text>
          <Text style={styles.role}>
            {post.autor.tipo_usuario === "artista" ? "Artista" : "Contratante"}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={13} color="#3F3F46" />
            </TouchableOpacity>
          )}
        </View>

        {/* Location */}
        {post.cidade && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color="#52525B" />
            <Text style={styles.location}>
              {post.cidade}{post.estado ? `, ${post.estado}` : ""}
            </Text>
          </View>
        )}

        {/* Tipo badge */}
        {tipo && (
          <Text style={[styles.tipoBadge, { color: tipo.color }]}>
            {tipo.label}
          </Text>
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
                  { width: post.imagens.length === 1 ? "100%" : imageWidth },
                  { height: post.imagens.length === 1 ? 200 : imageWidth },
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
              size={18}
              color={liked ? "#EC4899" : "#52525B"}
            />
            {likeCount > 0 && (
              <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onComment?.(post)} style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={17} color="#52525B" />
            {post.comentarios_count > 0 && (
              <Text style={styles.actionCount}>{post.comentarios_count}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Ionicons name="arrow-redo-outline" size={18} color="#52525B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1A1A1A",
  },

  // Left column
  leftCol: {
    width: 40,
    alignItems: "center",
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // Right column
  rightCol: {
    flex: 1,
    paddingBottom: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 2,
  },
  name: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 140,
  },
  role: {
    color: "#52525B",
    fontSize: 12,
  },
  dot: {
    color: "#3F3F46",
    fontSize: 12,
  },
  time: {
    color: "#52525B",
    fontSize: 12,
  },
  deleteBtn: {
    marginLeft: "auto",
    padding: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 6,
  },
  location: {
    color: "#52525B",
    fontSize: 11,
  },
  tipoBadge: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  content: {
    color: "#E4E4E7",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    color: "#EC4899",
    fontSize: 13,
    fontWeight: "500",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 10,
  },
  postImage: {
    borderRadius: 10,
    backgroundColor: "#27272A",
  },
  actions: {
    flexDirection: "row",
    gap: 20,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    color: "#52525B",
    fontSize: 13,
  },
  actionCountLiked: {
    color: "#EC4899",
  },
});
