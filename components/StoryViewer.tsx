import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  Text,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { StoryGroup } from "@/services/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DEFAULT_DURATION = 5;

interface Props {
  stories: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  /** Chamado após marcar cada story como visualizado */
  onViewed?: (groupIndex: number, storyId: string) => void;
}

export default function StoryViewer({ stories, initialGroupIndex, onClose, onViewed }: Props) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  // Refs to avoid stale closures in animation callbacks
  const groupIndexRef = useRef(groupIndex);
  const storyIndexRef = useRef(storyIndex);
  groupIndexRef.current = groupIndex;
  storyIndexRef.current = storyIndex;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  const currentGroup = stories[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  const advance = useCallback(() => {
    const g = groupIndexRef.current;
    const s = storyIndexRef.current;
    const group = stories[g];
    if (s < group.stories.length - 1) {
      setStoryIndex(s + 1);
    } else if (g < stories.length - 1) {
      setGroupIndex(g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [stories, onClose]);

  const startProgress = useCallback(
    (duration: number) => {
      progressAnim.setValue(0);
      animRef.current?.stop();
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) advance();
      });
    },
    [progressAnim, advance],
  );

  useEffect(() => {
    if (!currentStory) return;
    api.visualizarStory(currentStory.id)
      .then(() => onViewed?.(groupIndexRef.current, currentStory.id))
      .catch(() => {});
    startProgress(currentStory.duracao || DEFAULT_DURATION);
    return () => {
      animRef.current?.stop();
    };
    // intentional: re-run only when group/story index changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  const goNext = useCallback(() => {
    animRef.current?.stop();
    advance();
  }, [advance]);

  const goPrev = useCallback(() => {
    animRef.current?.stop();
    const g = groupIndexRef.current;
    const s = storyIndexRef.current;
    if (s > 0) {
      setStoryIndex(s - 1);
    } else if (g > 0) {
      const prevGroup = stories[g - 1];
      setGroupIndex(g - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }, [stories]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!currentGroup || !currentStory) return null;

  // Detecta story de texto inline (sem upload de imagem)
  const isTextStory = currentStory.midia_url.startsWith("text-story:");
  let textStoryData: { text: string; colors: [string, string] } | null = null;
  if (isTextStory) {
    try {
      textStoryData = JSON.parse(
        currentStory.midia_url.slice("text-story:".length),
      );
    } catch {}
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <StatusBar hidden />

      {/* Media — foto ou texto com gradiente */}
      {isTextStory && textStoryData ? (
        <>
          <LinearGradient
            colors={textStoryData.colors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.textStoryWrap} pointerEvents="none">
            <Text style={styles.textStoryContent}>{textStoryData.text}</Text>
          </View>
        </>
      ) : (
        <Image
          source={{ uri: currentStory.midia_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Top gradient */}
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "transparent"]}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {currentGroup.stories.map((story, i) => (
          <View key={story.id} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i < storyIndex
                      ? "100%"
                      : i === storyIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header: avatar + name + close */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          {currentGroup.user.image ? (
            <Image source={{ uri: currentGroup.user.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {currentGroup.user.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.userName}>{currentGroup.user.name}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tap zones — left half goes back, right half goes forward */}
      <View style={styles.tapZones} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={goPrev}>
          <View style={styles.tapHalf} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext}>
          <View style={styles.tapHalf} />
        </TouchableWithoutFeedback>
      </View>

      {/* Bottom gradient */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.45)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  progressContainer: {
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  header: {
    position: "absolute",
    top: 64,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#27272A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  userName: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tapZones: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  tapHalf: {
    flex: 1,
  },
  textStoryWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  textStoryContent: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 42,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
