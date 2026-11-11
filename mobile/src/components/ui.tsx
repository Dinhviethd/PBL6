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
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSession } from "../lib/session";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme/tokens";
import { AppIcon, IconBadge, type IconName } from "./app-icon";
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
    borderCurve: "continuous",
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
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  label?: string;
  icon?: IconName;
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
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: secondary ? colors.border : colors.action,
        minHeight: 48,
        minWidth: 48,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        backgroundColor: secondary ? colors.elevated : colors.action,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      {icon && (
        <AppIcon
          name={icon}
          size={19}
          color={secondary ? colors.primary : colors.onPrimary}
        />
      )}
      <Text
        style={{
          color: secondary ? colors.ink : colors.onPrimary,
          fontSize: 14,
          fontFamily: fonts.bold,
          textAlign: "center",
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  style,
  trailing,
  icon,
  ...props
}: TextInputProps & { label: string; trailing?: ReactNode; icon?: IconName }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={ui.muted}>{label}</Text>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          keyboardAppearance="dark"
          style={[
            {
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              borderCurve: "continuous",
              padding: 14,
              minHeight: 52,
              paddingRight: trailing ? 62 : 14,
              paddingLeft: icon ? 46 : 14,
              fontSize: 16,
              fontFamily: fonts.regular,
              color: colors.ink,
              backgroundColor: colors.surface,
            },
            style,
          ]}
          {...props}
        />
        {icon && (
          <View pointerEvents="none" style={{ position: "absolute", left: 14 }}>
            <AppIcon name={icon} size={18} color={colors.muted} />
          </View>
        )}
        {trailing && (
          <View style={{ position: "absolute", right: 2 }}>{trailing}</View>
        )}
      </View>
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
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <View style={{ paddingTop: 2 }}>
        <AppIcon
          name={error ? "alert-circle" : "info"}
          size={19}
          color={error ? colors.red : colors.primary}
        />
      </View>
      <Text
        style={{
          ...ui.text,
          flex: 1,
          minWidth: 0,
          color: error ? colors.red : colors.primary,
        }}
      >
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
        <IconBadge name="user" size={64} />
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
          icon="log-in"
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
  loading = false,
  error = false,
}: {
  page: number;
  setPage: (page: number) => void;
  more: boolean;
  loading?: boolean;
  error?: boolean;
}) {
  if (loading || error || (page === 0 && !more)) return null;
  return (
    <View style={{ ...ui.row, justifyContent: "center", flexWrap: "nowrap" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trang trước"
        accessibilityState={{ disabled: page === 0 }}
        disabled={page === 0}
        onPress={() => setPage(page - 1)}
        style={({ pressed }) => ({
          minWidth: 48,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: page === 0 ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <AppIcon name="chevron-left" />
      </Pressable>
      <Text
        style={[
          ui.muted,
          { flexShrink: 1, minWidth: 0, fontVariant: ["tabular-nums"] },
        ]}
      >
        Trang {page + 1}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Trang sau"
        accessibilityState={{ disabled: !more }}
        disabled={!more}
        onPress={() => setPage(page + 1)}
        style={({ pressed }) => ({
          minWidth: 48,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: !more ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <AppIcon name="chevron-right" />
      </Pressable>
    </View>
  );
}
