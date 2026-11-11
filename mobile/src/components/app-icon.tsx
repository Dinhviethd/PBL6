import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";
import { colors } from "../theme/tokens";

export type IconName = keyof typeof Feather.glyphMap;

// Labels belong to the surrounding control, so decorative glyphs stay silent.
export function AppIcon({
  name,
  size = 20,
  color = colors.primary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={false}
      aria-hidden
      importantForAccessibility="no"
    />
  );
}

export function IconBadge({
  name,
  size = 44,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        borderCurve: "continuous",
        backgroundColor: colors.accentSurface,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AppIcon name={name} size={size > 48 ? 28 : 20} />
    </View>
  );
}
