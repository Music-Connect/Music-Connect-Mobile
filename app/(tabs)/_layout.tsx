import { Tabs, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { HapticTab } from "@/components/haptic-tab";
import TabIcon from "@/components/TabIcon";
import api from "@/services/api";

export default function TabLayout() {
  const [userType, setUserType] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadUserType = async () => {
        try {
          const response = await api.getMe();
          if (response?.tipo_usuario) {
            setUserType(response.tipo_usuario);
          }
        } catch (error) {
          console.error("Erro ao carregar tipo de usuário:", error);
        }
      };
      loadUserType();
    }, []),
  );

  const isArtist = userType === "artista";

  return (
    <Tabs
      initialRouteName="social-feed"
      screenOptions={{
        tabBarActiveTintColor: "#EC4899",
        tabBarInactiveTintColor: "#555",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "#1A1A1A",
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      {/* 1: Social Feed — principal */}
      <Tabs.Screen
        name="social-feed"
        options={{
          href: "/(tabs)/social-feed",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "newspaper" : "newspaper-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 2: Oportunidades / Home */}
      <Tabs.Screen
        name="index"
        options={{
          href: "/(tabs)",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 3: Propostas (artista) | Explorar (contratante) */}
      {isArtist ? (
        <Tabs.Screen
          name="minhas-propostas"
          options={{
            href: "/(tabs)/minhas-propostas",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "mail-open" : "mail-open-outline"} color={color} focused={focused} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="explore"
          options={{
            href: "/(tabs)/explore",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "search" : "search-outline"} color={color} focused={focused} />
            ),
          }}
        />
      )}

      {/* 4: Portfólio (artista) | Propostas (contratante) */}
      {isArtist ? (
        <Tabs.Screen
          name="portfolio"
          options={{
            href: "/(tabs)/portfolio",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "images" : "images-outline"} color={color} focused={focused} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="minhas-propostas"
          options={{
            href: "/(tabs)/minhas-propostas",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "document-text" : "document-text-outline"} color={color} focused={focused} />
            ),
          }}
        />
      )}

      {/* 5: Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(tabs)/profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
