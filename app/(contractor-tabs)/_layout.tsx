import { Tabs } from "expo-router";
import React from "react";
import { HapticTab } from "@/components/haptic-tab";
import TabIcon from "@/components/TabIcon";

export default function ContractorTabLayout() {
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
          href: "/(contractor-tabs)/social-feed",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "newspaper" : "newspaper-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 2: Explorar artistas */}
      <Tabs.Screen
        name="explore"
        options={{
          href: "/(contractor-tabs)/explore",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "search" : "search-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 3: Minhas propostas */}
      <Tabs.Screen
        name="minhas-propostas"
        options={{
          href: "/(contractor-tabs)/minhas-propostas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "document-text" : "document-text-outline"} color={color} focused={focused} />
          ),
        }}
      />

      {/* 4: Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(contractor-tabs)/profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
