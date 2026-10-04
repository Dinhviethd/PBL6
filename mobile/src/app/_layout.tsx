import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session";
import { colors } from "../components/ui";
export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: "Quay lại",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Tài khoản EventHub" }} />
        <Stack.Screen
          name="events/[slug]"
          options={{ title: "Chi tiết sự kiện" }}
        />
        <Stack.Screen name="orders/[id]" options={{ title: "Đơn hàng" }} />
        <Stack.Screen name="tickets/[id]" options={{ title: "Vé điện tử" }} />
        <Stack.Screen
          name="checkin/[id]"
          options={{ title: "Check-in sự kiện" }}
        />
      </Stack>
    </SessionProvider>
  );
}
