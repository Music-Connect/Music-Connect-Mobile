import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface AppHeaderProps {
  user?: {
    usuario?: string;
    imagem_perfil_url?: string;
    tipo_usuario?: string;
  } | null;
  showSearch?: boolean;
  showNotifications?: boolean;
  title?: string;
  notificationCount?: number;
  onSearchPress?: () => void;
}

export default function AppHeader({
  user,
  showSearch = true,
  showNotifications = true,
  title,
  notificationCount = 0,
  onSearchPress,
}: AppHeaderProps) {
  const router = useRouter();

  const getInitial = () => user?.usuario?.charAt(0).toUpperCase() ?? "U";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Left: Avatar */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/profile")}
        activeOpacity={0.7}
      >
        {user?.imagem_perfil_url ? (
          <Image source={{ uri: user.imagem_perfil_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{getInitial()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Center: Logo or Title */}
      <View style={styles.center}>
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>Music</Text>
            {" Connect"}
          </Text>
        )}
      </View>

      {/* Right: Actions */}
      <View style={styles.actions}>
        {showSearch && (
          <TouchableOpacity
            onPress={onSearchPress ?? (() => router.push("/advanced-search" as any))}
            activeOpacity={0.7}
            style={styles.iconBtn}
          >
            <Ionicons name="search-outline" size={22} color="#E4E4E7" />
          </TouchableOpacity>
        )}
        {showNotifications && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.iconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color="#E4E4E7" />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 10,
    backgroundColor: "#000",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1A1A1A",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  logo: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  logoAccent: {
    color: "#EC4899",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EC4899",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
