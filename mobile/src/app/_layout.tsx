import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { colors, fonts } from "../components/ui";
export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.regular]: require("../../assets/fonts/be-vietnam-pro-400.ttf"),
    [fonts.medium]: require("../../assets/fonts/be-vietnam-pro-500.ttf"),
    [fonts.semibold]: require("../../assets/fonts/be-vietnam-pro-600.ttf"),
    [fonts.bold]: require("../../assets/fonts/be-vietnam-pro-700.ttf"),
    [fonts.extraBold]: require("../../assets/fonts/be-vietnam-pro-800.ttf"),
  });
  // Allow system-font fallback if a local font cannot be loaded.
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Đang tải giao diện"
        />
      </View>
    );
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.bold },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: "Quay lại",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Tài khoản EventHub" }} />
        <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
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
