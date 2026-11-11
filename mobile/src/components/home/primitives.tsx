import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { homeColors as c, homeStyles as s } from "../../theme/home";
import { fonts } from "../../theme/tokens";
import { AppIcon, type IconName } from "../app-icon";

export function HomeButton({
  title,
  onPress,
  secondary = false,
  icon,
  disabled = false,
  label,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: secondary ? c.border : c.purple,
        backgroundColor: secondary ? c.surface : c.purple,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      })}
    >
      {icon && <Feather name={icon} size={17} color={c.text} />}
      <Text
        style={{
          color: c.text,
          fontFamily: fonts.bold,
          fontSize: 13,
          lineHeight: 20,
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

export function SectionTitle({
  eyebrow,
  title,
  children,
  icon = "compass",
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  icon?: IconName;
}) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <AppIcon name={icon} size={16} color={c.cyan} />
        <Text style={[s.eyebrow, { flex: 1 }]}>{eyebrow}</Text>
      </View>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ResourceState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty?: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <ActivityIndicator
        accessibilityLabel="Đang tải"
        color={c.cyan}
        style={{ padding: 28 }}
      />
    );
  if (error)
    return (
      <View style={s.card}>
        <Text accessibilityRole="alert" style={[s.body, { color: c.pink }]}>
          {error}
        </Text>
        <HomeButton title="Thử lại" onPress={onRetry} secondary />
      </View>
    );
  if (empty)
    return <Text style={[s.muted, { paddingVertical: 20 }]}>{empty}</Text>;
  return children;
}

export function HomeSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000099",
          paddingTop: insets.top + 20,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng hộp thoại"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "90%",
            flexShrink: 1,
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: c.border,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              gap: 12,
            }}
          >
            <Text
              accessibilityRole="header"
              style={[s.title, { flex: 1, fontSize: 21 }]}
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="x" size={23} color={c.text} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 12,
              gap: 16,
            }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
