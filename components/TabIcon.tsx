import React from "react";
import { View, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface TabIconProps {
  name: string;
  color: string;
  size?: number;
  focused: boolean;
}

export default function TabIcon({ name, color, size = 24, focused }: TabIconProps) {
  return (
    <View style={styles.wrapper}>
      <IconSymbol size={size} name={name} color={color} />
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
