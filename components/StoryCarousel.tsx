import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StoryGroup } from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";

interface StoryCarouselProps {
  stories: StoryGroup[];
  currentUserId?: string;
  onOpenStory: (index: number) => void;
  onCreateStory: () => void;
}

export default function StoryCarousel({
  stories,
  currentUserId,
  onOpenStory,
  onCreateStory,
}: StoryCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Create story button */}
      <TouchableOpacity onPress={onCreateStory} style={styles.storyItem}>
        <View style={styles.createBtn}>
          <Ionicons name="add" size={24} color="#A1A1AA" />
        </View>
        <Text style={styles.storyLabel} numberOfLines={1}>Criar</Text>
      </TouchableOpacity>

      {/* Story items */}
      {stories.map((group, i) => (
        <TouchableOpacity key={group.user.id} onPress={() => onOpenStory(i)} style={styles.storyItem}>
          {group.hasUnseen ? (
            <LinearGradient
              colors={["#FBBF24", "#EC4899", "#A855F7"]}
              style={styles.gradientRing}
            >
              <View style={styles.innerRing}>
                {group.user.image ? (
                  <Image source={{ uri: group.user.image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{group.user.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.seenRing}>
              <View style={styles.innerRing}>
                {group.user.image ? (
                  <Image source={{ uri: group.user.image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{group.user.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          <Text style={styles.storyLabel} numberOfLines={1}>
            {group.user.id === currentUserId ? "Você" : group.user.name?.split(" ")[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 12, paddingVertical: 12 },
  storyItem: { alignItems: "center", width: 68 },
  createBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3F3F46",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(63,63,70,0.3)",
  },
  gradientRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2,
  },
  seenRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2,
    backgroundColor: "#3F3F46",
  },
  innerRing: {
    flex: 1,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "#000",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 28 },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "#27272A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  storyLabel: {
    color: "#A1A1AA",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
});
