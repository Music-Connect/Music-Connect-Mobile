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
      <Tabs.Screen
        name="social-feed"
        options={{
          href: "/(tabs)/social-feed",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="newspaper.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: "/(tabs)",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house.fill" color={color} focused={focused} />
          ),
        }}
      />
      {isArtist ? (
        <Tabs.Screen
          name="minhas-propostas"
          options={{
            href: "/(tabs)/minhas-propostas",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="envelope.open.fill" color={color} focused={focused} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="explore"
          options={{
            href: "/(tabs)/explore",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="magnifyingglass" color={color} focused={focused} />
            ),
          }}
        />
      )}
      {isArtist ? (
        <Tabs.Screen
          name="portfolio"
          options={{
            href: "/(tabs)/portfolio",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="film.fill" color={color} focused={focused} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="minhas-propostas"
          options={{
            href: "/(tabs)/minhas-propostas",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="doc.text.fill" color={color} focused={focused} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(tabs)/profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person.fill" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
