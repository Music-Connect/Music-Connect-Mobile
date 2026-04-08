import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import api from "@/services/api";
import Header from "@/components/shared/Header";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { useFormState } from "@/hooks/useFormState";

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const { form, handleChange, setForm } = useFormState({
    nome: "",
    email: "",
    telefone: "",
    local_atuacao: "",
    descricao: "",
  });

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const loadUserData = async () => {
    try {
      setInitializing(true);
      const response = await api.getMe();
      if (response) {
        const user = response as any;
        setUserId(user.id || "");
        setAvatarUri(user.image || null);
        setForm({
          nome: user.nome || user.name || "",
          email: user.email || "",
          telefone: user.telefone || "",
          local_atuacao:
            user.local_atuacao ||
            user.area_atuacao ||
            user.especialidades ||
            "",
          descricao: user.descricao || "",
        });
      }
    } catch {
      Alert.alert("Erro", "Falha ao carregar dados do perfil");
    } finally {
      setInitializing(false);
    }
  };

  const handleAlterarFoto = async () => {
    // 1. Solicita permissão à galeria
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão negada",
        "Precisamos de acesso à galeria para alterar sua foto. Vá em Configurações e conceda a permissão.",
      );
      return;
    }

    // 2. Abre a galeria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selectedUri = result.assets[0].uri;

    try {
      setUploadingAvatar(true);

      // 3. Comprime: redimensiona para 800×800 e aplica JPEG 70%
      const compressed = await ImageManipulator.manipulateAsync(
        selectedUri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Preview local imediato enquanto faz upload
      setAvatarUri(compressed.uri);

      // 4. Envia para POST /api/uploads
      const imageUrl = await api.uploadAvatar(compressed.uri);

      // 5. Atualiza o perfil com a URL retornada
      await api.updateProfile(userId, { image: imageUrl } as any);

      Alert.alert("Sucesso", "Foto de perfil atualizada!");
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao atualizar a foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome || !form.email) {
      Alert.alert("Erro", "Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile(userId, {
        name: form.nome,
        email: form.email,
        telefone: form.telefone,
      } as any);

      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Falha ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Header title="Editar Perfil" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#EC4899" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Header title="Editar Perfil" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Avatar Section */}
        <Card style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={handleAlterarFoto}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
              style={styles.avatarWrapper}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {form.nome.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Overlay de loading durante upload */}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}

              {/* Badge de edição */}
              {!uploadingAvatar && (
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditBadgeText}>✎</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{form.nome}</Text>
              <Button
                label={uploadingAvatar ? "Enviando..." : "Alterar Foto"}
                variant="secondary"
                onPress={handleAlterarFoto}
                disabled={uploadingAvatar}
              />
            </View>
          </View>
        </Card>

        {/* Form */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={form.nome}
              onChangeText={(text) => handleChange("nome", text)}
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => handleChange("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={form.telefone}
              onChangeText={(text) => handleChange("telefone", text)}
              keyboardType="phone-pad"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Local de Atuação</Text>
            <TextInput
              style={styles.input}
              value={form.local_atuacao}
              onChangeText={(text) => handleChange("local_atuacao", text)}
              placeholder="Ex: São Paulo, SP"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sobre Você</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.descricao}
              onChangeText={(text) => handleChange("descricao", text)}
              placeholder="Conte sobre seu trabalho..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>
        </Card>

        {/* Info Section */}
        <Card variant="ghost" style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              Seus dados são protegidos e não serão compartilhados
            </Text>
          </View>
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Zona de Risco</Text>
          <Button
            label="Alterar Senha"
            variant="outline"
            onPress={() => {}}
            icon="🔑"
          />
          <Button
            label="Deletar Conta"
            variant="danger"
            onPress={() => {}}
            icon="⚠️"
            style={styles.deleteButton}
          />
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={() => router.back()}
        />
        <Button
          label="Salvar Alterações"
          variant="primary"
          onPress={handleSave}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#999",
  },
  avatarSection: {
    marginBottom: 20,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrapper: {
    position: "relative",
    width: 80,
    height: 80,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#EC4899",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EC4899",
    borderWidth: 2,
    borderColor: "#18181B",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarInfo: {
    flex: 1,
    gap: 10,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  formCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#3F3F46",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  infoCard: {
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#999",
    lineHeight: 16,
  },
  dangerCard: {
    borderColor: "#EF4444",
    marginBottom: 20,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 8,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#18181B",
  },
});
