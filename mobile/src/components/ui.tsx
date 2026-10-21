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

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme/tokens";
export { colors, fonts } from "../theme/tokens";

export const ui = StyleSheet.create({
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.extraBold,
    color: colors.ink,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 2,
    color: colors.primary,
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
    backgroundColor: colors.surface,
    gap: 12,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  badge: {
    color: colors.primary,
    backgroundColor: colors.accentSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
});
export function Screen({
  children,
  refresh,
  loading = false,
  footer,
}: {
  children: ReactNode;
  refresh?: () => void;
  loading?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 24 + insets.bottom,
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
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {footer && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 580,
              alignSelf: "center",
              gap: 8,
            }}
          >
            {footer}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
  label,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 14,
        borderWidth: 1,
        borderColor: secondary ? colors.border : colors.primary,
        minHeight: 48,
        minWidth: 48,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? colors.elevated : colors.primary,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? colors.ink : colors.onPrimary,
          fontSize: 14,
          fontFamily: fonts.bold,
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
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        keyboardAppearance="dark"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          fontFamily: fonts.regular,
          color: colors.ink,
          backgroundColor: colors.surface,
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
        backgroundColor: error ? colors.errorSurface : colors.accentSurface,
      }}
    >
      <Text style={{ ...ui.text, color: error ? colors.red : colors.primary }}>
        {text}
      </Text>
    </View>
  ) : null;
}
export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel="Đang tải"
      color={colors.primary}
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
