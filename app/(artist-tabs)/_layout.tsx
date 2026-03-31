import { Tabs } from "expo-router";
import React from "react";
import { HapticTab } from "@/components/haptic-tab";
import TabIcon from "@/components/TabIcon";

export default function ArtistTabLayout() {
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
      {/* 1: Feed social — principal */}
      <Tabs.Screen
        name="social-feed"
        options={{
          href: "/(artist-tabs)/social-feed",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "newspaper" : "newspaper-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 2: Oportunidades */}
      <Tabs.Screen
        name="index"
        options={{
          href: "/(artist-tabs)",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 3: Propostas recebidas */}
      <Tabs.Screen
        name="minhas-propostas"
        options={{
          href: "/(artist-tabs)/minhas-propostas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "mail-open" : "mail-open-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 4: Portfólio */}
      <Tabs.Screen
        name="portfolio"
        options={{
          href: "/(artist-tabs)/portfolio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "images" : "images-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 5: Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(artist-tabs)/profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
