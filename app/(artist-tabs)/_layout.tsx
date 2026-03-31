import { Tabs } from "expo-router";
import React from "react";
import { HapticTab } from "@/components/haptic-tab";
import TabIcon from "@/components/TabIcon";

export default function ArtistTabLayout() {
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
        name="index"
        options={{
          href: "/(artist-tabs)",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="minhas-propostas"
        options={{
          href: "/(artist-tabs)/minhas-propostas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="envelope.open.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: "/(artist-tabs)/portfolio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="film.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(artist-tabs)/profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person.fill" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
