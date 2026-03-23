import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";

export default function CreatePostScreen() {
  const router = useRouter();
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<"post" | "disponibilidade" | "buscando">("post");
  const [tagsInput, setTagsInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const addImage = () => {
    if (imageUrl.trim() && imagens.length < 10) {
      setImagens([...imagens, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const handlePublish = async () => {
    if (!conteudo.trim()) return;
    setLoading(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await api.createPost({
        conteudo: conteudo.trim(),
        tipo,
        imagens: imagens.length > 0 ? imagens : undefined,
        video_url: videoUrl.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      Alert.alert("Sucesso", "Publicação criada!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Erro ao criar post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Publicação</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!conteudo.trim() || loading}
          style={[styles.publishBtn, (!conteudo.trim() || loading) && { opacity: 0.3 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.publishText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Post type */}
        <View style={styles.typeRow}>
          {[
            { value: "post", label: "Post" },
            { value: "disponibilidade", label: "Disponível" },
            { value: "buscando", label: "Buscando" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setTipo(opt.value as any)}
              style={[
                styles.typeBtn,
                tipo === opt.value && styles.typeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  tipo === opt.value && styles.typeTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <TextInput
          value={conteudo}
          onChangeText={setConteudo}
          placeholder={
            tipo === "disponibilidade"
              ? "Conte sobre sua disponibilidade..."
              : tipo === "buscando"
              ? "Descreva o artista que você busca..."
              : "O que você quer compartilhar?"
          }
          placeholderTextColor="#52525B"
          multiline
          maxLength={2000}
          style={styles.contentInput}
        />
        <Text style={styles.charCount}>{conteudo.length}/2000</Text>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Ionicons name="pricetag-outline" size={16} color="#52525B" />
          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="Tags (separadas por vírgula)"
            placeholderTextColor="#52525B"
            style={styles.textInput}
          />
        </View>

        {/* Image URLs */}
        <Text style={styles.sectionLabel}>Imagens ({imagens.length}/10)</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="URL da imagem"
            placeholderTextColor="#52525B"
            style={[styles.textInput, { flex: 1 }]}
          />
          <TouchableOpacity
            onPress={addImage}
            disabled={!imageUrl.trim() || imagens.length >= 10}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        {imagens.map((img, i) => (
          <View key={i} style={styles.imageItem}>
            <Text style={styles.imageUrl} numberOfLines={1}>{img}</Text>
            <TouchableOpacity onPress={() => setImagens(imagens.filter((_, idx) => idx !== i))}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Video URL */}
        <View style={[styles.inputGroup, { marginTop: 16 }]}>
          <Ionicons name="videocam-outline" size={16} color="#52525B" />
          <TextInput
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="URL do vídeo (YouTube)"
            placeholderTextColor="#52525B"
            style={styles.textInput}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(63,63,70,0.3)",
  },
  title: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  publishBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishText: { color: "#000", fontSize: 13, fontWeight: "700" },
  body: { flex: 1, padding: 16 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3F3F46",
    backgroundColor: "rgba(63,63,70,0.3)",
  },
  typeBtnActive: { borderColor: "#EC4899", backgroundColor: "rgba(236,72,153,0.1)" },
  typeText: { color: "#A1A1AA", fontSize: 12, fontWeight: "600" },
  typeTextActive: { color: "#EC4899" },
  contentInput: {
    color: "#FFF",
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: { color: "#52525B", fontSize: 10, textAlign: "right", marginBottom: 16 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(63,63,70,0.4)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(39,39,42,0.3)",
    marginBottom: 12,
  },
  textInput: { color: "#FFF", fontSize: 13, flex: 1 },
  sectionLabel: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  addBtn: {
    backgroundColor: "#27272A",
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(39,39,42,0.3)",
    borderRadius: 8,
    marginBottom: 4,
  },
  imageUrl: { color: "#A1A1AA", fontSize: 11, flex: 1 },
});
