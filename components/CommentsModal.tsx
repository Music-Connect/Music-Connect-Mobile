import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api, { Comentario } from "@/services/api";

interface Props {
  visible: boolean;
  postId: string;
  currentUserId?: string;
  onClose: () => void;
  /** Notifica o pai (PostCard) sobre mudança no total de comentários para atualizar UI otimista. */
  onCountChange?: (delta: number) => void;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function CommentsModal({
  visible,
  postId,
  currentUserId,
  onClose,
  onCountChange,
}: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  // Reset quando o modal abre
  useEffect(() => {
    if (!visible) return;
    setComentarios([]);
    setCursor(null);
    setHasMore(false);
    setReplyTo(null);
    setText("");
    void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  const load = async (afterCursor: string | null) => {
    if (afterCursor) setLoadingMore(true);
    else setLoading(true);
    try {
      const result = await api.getComentarios(postId, afterCursor ?? undefined);
      setComentarios((prev) =>
        afterCursor ? [...prev, ...result.comentarios] : result.comentarios,
      );
      setCursor(result.meta.nextCursor);
      setHasMore(result.meta.hasMore);
    } catch (err) {
      console.error("Erro ao carregar comentários:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || !cursor) return;
    void load(cursor);
  };

  const handleSubmit = async () => {
    const conteudo = text.trim();
    if (!conteudo || sending) return;

    setSending(true);
    try {
      const novo = await api.createComentario(postId, {
        conteudo,
        id_comentario_pai: replyTo?.id,
      });
      // Anexa otimisticamente
      if (replyTo) {
        setComentarios((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, respostas: [...(c.respostas ?? []), novo] }
              : c,
          ),
        );
      } else {
        setComentarios((prev) => [novo, ...prev]);
      }
      onCountChange?.(+1);
      setText("");
      setReplyTo(null);
    } catch (err) {
      console.error("Erro ao enviar comentário:", err);
      Alert.alert("Erro", "Não foi possível enviar o comentário.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (comentario: Comentario) => {
    Alert.alert(
      "Excluir comentário",
      "Esta ação é irreversível. O texto será substituído por '[excluído]'.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteComentario(postId, comentario.id);
              // Atualiza localmente: marca conteudo como [excluído]
              setComentarios((prev) =>
                prev.map((c) => {
                  if (c.id === comentario.id) {
                    return { ...c, conteudo: "[excluído]" };
                  }
                  return {
                    ...c,
                    respostas: c.respostas?.map((r) =>
                      r.id === comentario.id ? { ...r, conteudo: "[excluído]" } : r,
                    ),
                  };
                }),
              );
              onCountChange?.(-1);
            } catch {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Comentario }) => {
    const isDeleted = item.conteudo === "[excluído]";
    const isOwner = currentUserId === item.id_autor;
    return (
      <View style={styles.commentBlock}>
        <CommentRow
          comentario={item}
          isDeleted={isDeleted}
          isOwner={isOwner}
          onReply={() => setReplyTo({ id: item.id, name: item.autor.name })}
          onDelete={() => handleDelete(item)}
        />

        {/* Respostas aninhadas (até 3 vêm do backend; "Ver mais" futuro) */}
        {item.respostas && item.respostas.length > 0 && (
          <View style={styles.respostasContainer}>
            {item.respostas.map((r) => (
              <CommentRow
                key={r.id}
                comentario={r}
                isDeleted={r.conteudo === "[excluído]"}
                isOwner={currentUserId === r.id_autor}
                onReply={() => setReplyTo({ id: item.id, name: r.autor.name })}
                onDelete={() => handleDelete(r)}
                isReply
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Comentários</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color="#A1A1AA" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#EC4899" />
            </View>
          ) : (
            <FlatList
              data={comentarios}
              keyExtractor={(c) => c.id}
              renderItem={renderItem}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              contentContainerStyle={
                comentarios.length === 0 ? styles.emptyWrap : styles.listContent
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#3F3F46" />
                  <Text style={styles.emptyText}>Nenhum comentário ainda</Text>
                  <Text style={styles.emptyHint}>Seja o primeiro a comentar</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingFooter}>
                    <ActivityIndicator color="#52525B" />
                  </View>
                ) : null
              }
            />
          )}

          {/* Reply banner */}
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Respondendo a{" "}
                <Text style={styles.replyBannerName}>{replyTo.name}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={16} color="#71717A" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={
                replyTo ? `Responder a ${replyTo.name}...` : "Escreva um comentário..."
              }
              placeholderTextColor="#52525B"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnDisabled,
              ]}
            >
              <Ionicons
                name="send"
                size={18}
                color={!text.trim() || sending ? "#3F3F46" : "#EC4899"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ── Subcomponente: linha de comentário ── */

interface CommentRowProps {
  comentario: Comentario;
  isDeleted: boolean;
  isOwner: boolean;
  onReply: () => void;
  onDelete: () => void;
  isReply?: boolean;
}

function CommentRow({
  comentario,
  isDeleted,
  isOwner,
  onReply,
  onDelete,
  isReply,
}: CommentRowProps) {
  return (
    <View style={[styles.row, isReply && styles.rowReply]}>
      {/* Avatar */}
      {comentario.autor.image ? (
        <Image source={{ uri: comentario.autor.image }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {comentario.autor.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.bodyHeader}>
          <Text style={styles.author}>{comentario.autor.name}</Text>
          <Text style={styles.time}>{timeAgo(comentario.created_at)}</Text>
        </View>
        <Text style={[styles.content, isDeleted && styles.contentDeleted]}>
          {comentario.conteudo}
        </Text>

        {/* Ações (oculta para comentários excluídos) */}
        {!isDeleted && (
          <View style={styles.bodyActions}>
            <TouchableOpacity onPress={onReply}>
              <Text style={styles.actionLink}>Responder</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={onDelete}>
                <Text style={[styles.actionLink, styles.actionLinkDanger]}>
                  Excluir
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0A0A0A",
    height: "85%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#27272A",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3F3F46",
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FAFAFA",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  loadingFooter: { paddingVertical: 16, alignItems: "center" },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    color: "#A1A1AA",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyHint: {
    color: "#52525B",
    fontSize: 12,
  },
  commentBlock: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowReply: {
    marginTop: 8,
    marginLeft: 32,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  body: { flex: 1 },
  bodyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  author: {
    color: "#FAFAFA",
    fontSize: 13,
    fontWeight: "700",
  },
  time: {
    color: "#52525B",
    fontSize: 11,
  },
  content: {
    color: "#D4D4D8",
    fontSize: 13,
    lineHeight: 18,
  },
  contentDeleted: {
    color: "#52525B",
    fontStyle: "italic",
  },
  bodyActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  actionLink: {
    color: "#71717A",
    fontSize: 12,
    fontWeight: "600",
  },
  actionLinkDanger: {
    color: "#EF4444",
  },
  respostasContainer: {
    marginTop: 4,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#18181B",
    borderTopWidth: 0.5,
    borderTopColor: "#27272A",
  },
  replyBannerText: { color: "#71717A", fontSize: 12 },
  replyBannerName: { color: "#A1A1AA", fontWeight: "700" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 0.5,
    borderTopColor: "#27272A",
    backgroundColor: "#0A0A0A",
    gap: 8,
  },
  input: {
    flex: 1,
    color: "#FAFAFA",
    fontSize: 14,
    backgroundColor: "#18181B",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(236,72,153,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "transparent",
  },
});
