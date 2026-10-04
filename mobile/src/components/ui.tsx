import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSession } from "../lib/session";

export const colors = {
  bg: "#f5f6f0",
  ink: "#163b30",
  green: "#215c48",
  lime: "#d6ed91",
  muted: "#66756a",
  border: "#dce3d8",
  white: "#ffffff",
  red: "#a3302b",
};
export const ui = StyleSheet.create({
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
  },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.ink },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.green,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: 12,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  badge: {
    color: colors.green,
    backgroundColor: "#edf4df",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "600",
  },
});
export function Screen({
  children,
  refresh,
  loading = false,
}: {
  children: ReactNode;
  refresh?: () => void;
  loading?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
          gap: 18,
          width: "100%",
          maxWidth: 620,
          alignSelf: "center",
        }}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.green}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 12,
        minHeight: 48,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? "#e8eee3" : colors.green,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? colors.green : "white",
          fontSize: 14,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={ui.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#87968a"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          color: colors.ink,
          backgroundColor: colors.white,
        }}
        {...props}
      />
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text?: string | null;
  error?: boolean;
}) {
  return text ? (
    <View
      accessibilityRole="alert"
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: error ? "#fff0eb" : "#eaf2dd",
      }}
    >
      <Text style={{ ...ui.text, color: error ? colors.red : colors.green }}>
        {text}
      </Text>
    </View>
  ) : null;
}
export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel="Đang tải"
      color={colors.green}
      style={{ padding: 24 }}
    />
  );
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user, error, retry } = useSession(),
    pathname = usePathname();
  if (!ready) return <Loading />;
  if (!user)
    return (
      <Screen>
        <Text style={ui.title}>Chào bạn.</Text>
        <Text style={ui.text}>
          Đăng nhập để xem vé, đặt chỗ và nhận phân công check-in.
        </Text>
        <Notice error text={error} />
        {error && (
          <Button title="Thử khôi phục phiên" secondary onPress={retry} />
        )}
        <Button
          title="Đăng nhập"
          onPress={() =>
            router.push({ pathname: "/auth", params: { next: pathname } })
          }
        />
      </Screen>
    );
  return children;
}
export function Pager({
  page,
  setPage,
  more,
}: {
  page: number;
  setPage: (page: number) => void;
  more: boolean;
}) {
  return (
    <View style={{ ...ui.row, justifyContent: "space-between" }}>
      <Button
        title="Trước"
        secondary
        disabled={page === 0}
        onPress={() => setPage(page - 1)}
      />
      <Text style={ui.muted}>Trang {page + 1}</Text>
      <Button
        title="Sau"
        secondary
        disabled={!more}
        onPress={() => setPage(page + 1)}
      />
    </View>
  );
}
