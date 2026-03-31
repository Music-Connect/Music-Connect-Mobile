import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TabIconProps {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}

export default function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name={name} size={24} color={color} />
      {focused && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EC4899",
  },
});
