import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import api from "@/services/api";

// ─── Paleta de gradientes ────────────────────────────────────────────────────

const GRADIENTS: [string, string][] = [
  ["#EC4899", "#A855F7"], // Pink → Purple (brand)
  ["#3B82F6", "#06B6D4"], // Blue → Cyan
  ["#F97316", "#FBBF24"], // Orange → Yellow
  ["#10B981", "#14B8A6"], // Green → Teal
  ["#1E1E1E", "#3F3F46"], // Dark
  ["#EF4444", "#F97316"], // Red → Orange
];

type Mode = "foto" | "texto";

// ─── Componente principal ────────────────────────────────────────────────────

export default function CreateStoryScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("foto");

  // Modo foto
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  // Modo texto
  const [selectedGradient, setSelectedGradient] = useState(0);
  const [storyText, setStoryText] = useState("");

  // Upload
  const [publishing, setPublishing] = useState(false);

  // ── Pode publicar? ──────────────────────────────────────────────────────────
  const canPublish =
    !publishing &&
    (mode === "foto" ? photoUri !== null : storyText.trim().length > 0);

  // ── Picker de galeria ───────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão negada",
        "Precisamos de acesso à sua galeria para selecionar uma foto.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const compressed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1080, height: 1920 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );

    setPhotoUri(compressed.uri);
    setOverlayText("");
    setShowTextInput(false);
  };

  // ── Publicar ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true);
    try {
      let mediaUrl: string;
      let tipoMidia: string;

      if (mode === "foto") {
        mediaUrl = await api.uploadStoryMedia(photoUri!);
        tipoMidia = "imagem";
      } else {
        // Codifica o story de texto como JSON inline — sem necessidade de upload
        mediaUrl =
          "text-story:" +
          JSON.stringify({
            text: storyText.trim(),
            colors: GRADIENTS[selectedGradient],
          });
        tipoMidia = "imagem";
      }

      await api.createStory({
        midia_url: mediaUrl,
        tipo_midia: tipoMidia,
        duracao: 7,
      });

      router.back();
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível publicar o story");
    } finally {
      setPublishing(false);
    }
  };

  // ── Trocar modo ─────────────────────────────────────────────────────────────
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setShowTextInput(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={publishing}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Story</Text>

          <TouchableOpacity
            onPress={handlePublish}
            disabled={!canPublish}
            style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.publishBtnText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Preview — ocupa todo o espaço restante */}
      <View style={styles.preview}>
        {mode === "foto" ? (
          <FotoPreview
            photoUri={photoUri}
            overlayText={overlayText}
            showTextInput={showTextInput}
            onPickPhoto={handlePickPhoto}
            onToggleText={() => setShowTextInput((v) => !v)}
            onOverlayTextChange={setOverlayText}
          />
        ) : (
          <TextoPreview
            gradientColors={GRADIENTS[selectedGradient]}
            text={storyText}
            onTextChange={setStoryText}
          />
        )}
      </View>

      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        {/* Tabs de modo */}
        <View style={styles.modeTabs}>
          {(["foto", "texto"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => handleModeChange(m)}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === m && styles.modeTabTextActive,
                ]}
              >
                {m === "foto" ? "📸 Foto" : "✏️ Texto"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Controles específicos do modo */}
        {mode === "foto" ? (
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={styles.galleryBtn}
          >
            <Ionicons name="images-outline" size={22} color="#FFF" />
            <Text style={styles.galleryBtnText}>Galeria</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}
          >
            {GRADIENTS.map((g, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedGradient(i)}
                style={[
                  styles.swatchWrap,
                  selectedGradient === i && styles.swatchSelected,
                ]}
              >
                <LinearGradient
                  colors={g}
                  style={styles.swatch}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Sub-componente: Foto ─────────────────────────────────────────────────────

interface FotoPreviewProps {
  photoUri: string | null;
  overlayText: string;
  showTextInput: boolean;
  onPickPhoto: () => void;
  onToggleText: () => void;
  onOverlayTextChange: (t: string) => void;
}

function FotoPreview({
  photoUri,
  overlayText,
  showTextInput,
  onPickPhoto,
  onToggleText,
  onOverlayTextChange,
}: FotoPreviewProps) {
  return (
    <View style={styles.fotoContainer}>
      {photoUri ? (
        <>
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Texto overlay */}
          {overlayText.length > 0 && (
            <View style={styles.overlayTextWrap} pointerEvents="none">
              <Text style={styles.overlayText}>{overlayText}</Text>
            </View>
          )}

          {/* Botão "Aa" para toggle do input de texto */}
          <TouchableOpacity onPress={onToggleText} style={styles.aaBtn}>
            <Text style={styles.aaBtnText}>Aa</Text>
          </TouchableOpacity>

          {/* Input de texto overlay */}
          {showTextInput && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.overlayInputWrap}
            >
              <TextInput
                value={overlayText}
                onChangeText={onOverlayTextChange}
                placeholder="Escreva algo..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                autoFocus
                style={styles.overlayInput}
                returnKeyType="done"
                onSubmitEditing={onToggleText}
              />
            </KeyboardAvoidingView>
          )}
        </>
      ) : (
        /* Placeholder — sem foto selecionada */
        <TouchableOpacity
          onPress={onPickPhoto}
          style={styles.fotoPicker}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={56} color="#52525B" />
          <Text style={styles.fotoPickerText}>
            Toque para selecionar uma foto
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Sub-componente: Texto ────────────────────────────────────────────────────

interface TextoPreviewProps {
  gradientColors: [string, string];
  text: string;
  onTextChange: (t: string) => void;
}

function TextoPreview({ gradientColors, text, onTextChange }: TextoPreviewProps) {
  return (
    <View style={styles.textoContainer}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <TextInput
        value={text}
        onChangeText={onTextChange}
        multiline
        placeholder="Escreva seu story..."
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.textoInput}
        textAlignVertical="center"
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Header
  headerSafe: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  publishBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 82,
    alignItems: "center",
  },
  publishBtnDisabled: {
    opacity: 0.4,
  },
  publishBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },

  // Preview
  preview: {
    flex: 1,
  },

  // Foto mode
  fotoContainer: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  fotoPicker: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  fotoPickerText: {
    color: "#52525B",
    fontSize: 15,
    fontWeight: "500",
  },
  overlayTextWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  overlayText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  aaBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  aaBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  overlayInputWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayInput: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Texto mode
  textoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textoInput: {
    flex: 1,
    width: "100%",
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    padding: 32,
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingBottom: 32,
    paddingTop: 12,
    gap: 16,
  },
  modeTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  modeTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modeTabActive: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },
  modeTabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  modeTabTextActive: {
    color: "#000",
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  galleryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  swatchRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  swatchWrap: {
    borderRadius: 22,
    padding: 2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: "#FFF",
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
