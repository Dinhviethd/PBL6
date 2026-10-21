import { Tabs, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { useSession } from "../../lib/session";
import { useResource } from "../../lib/data";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../components/ui";
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const count = useResource<{ unreadCount: number }>(
    user ? "/me/notifications/count" : null,
  );
  const reloadCount = count.reload;
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const timer = setInterval(reloadCount, 30000);
      return () => clearInterval(timer);
    }, [user, reloadCount]),
  );
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerRight: () =>
          user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Thông báo, ${count.data?.unreadCount ?? 0} chưa đọc`}
              onPress={() => router.push("/notifications")}
              style={{
                minWidth: 48,
                minHeight: 48,
                marginRight: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="bell" color={colors.primary} size={22} />
              {!!count.data?.unreadCount && (
                <Text
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    color: colors.onPrimary,
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    fontSize: 11,
                  }}
                >
                  {count.data.unreadCount > 99 ? "99+" : count.data.unreadCount}
                </Text>
              )}
            </Pressable>
          ) : null,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + Math.max(insets.bottom, 12),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: fonts.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Khám phá",
          headerTitle: "eventhub.",
          tabBarIcon: ({ color, size }) => (
            <Feather name="compass" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Vé của tôi",
          tabBarIcon: ({ color, size }) => (
            <Feather name="tag" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Đơn hàng",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-bag" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color, size }) => (
            <Feather name="maximize" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
