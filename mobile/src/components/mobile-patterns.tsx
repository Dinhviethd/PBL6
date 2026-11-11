import { Pressable, Text, View } from "react-native";
import { AppIcon, IconBadge, type IconName } from "./app-icon";
import { colors, ui } from "./ui";

export function MenuRow({
  title,
  subtitle,
  icon,
  onPress,
  last = false,
  destructive = false,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress: () => void;
  last?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: 72,
        padding: 16,
        gap: 12,
        backgroundColor: pressed ? colors.elevated : colors.surface,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <IconBadge name={icon} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={[ui.text, { color: destructive ? colors.red : colors.ink }]}
        >
          {title}
        </Text>
        {subtitle && <Text style={ui.muted}>{subtitle}</Text>}
      </View>
      <AppIcon
        name={destructive ? "log-out" : "chevron-right"}
        size={18}
        color={destructive ? colors.red : colors.muted}
      />
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View
      style={[ui.card, { alignItems: "center", paddingVertical: 28, gap: 16 }]}
    >
      <IconBadge name={icon} size={64} />
      <Text accessibilityRole="header" style={[ui.h2, { textAlign: "center" }]}>
        {title}
      </Text>
      <Text style={[ui.muted, { textAlign: "center", maxWidth: 320 }]}>
        {description}
      </Text>
    </View>
  );
}

export function InfoLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ paddingTop: 3 }}>
        <AppIcon name={icon} size={16} color={colors.muted} />
      </View>
      <Text style={[ui.muted, { flex: 1, minWidth: 0 }]}>{text}</Text>
    </View>
  );
}
