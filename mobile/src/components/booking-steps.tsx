import { Text, View } from "react-native";
import { colors, ui } from "./ui";
import { AppIcon, type IconName } from "./app-icon";

export function BookingSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View
      style={{ ...ui.row, gap: 8 }}
      accessibilityLabel={`Bước ${step} trên 3`}
    >
      {["Chọn vé", "Thanh toán", "Nhận vé"].map((label, i) => (
        <View key={label} style={{ flex: 1, minWidth: 80, gap: 8 }}>
          <View
            style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: i < step ? colors.primary : colors.border,
            }}
          />
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}
          >
            <AppIcon
              name={
                i + 1 < step
                  ? "check-circle"
                  : (["tag", "credit-card", "maximize"] as IconName[])[i]
              }
              size={16}
              color={i < step ? colors.primary : colors.muted}
            />
            <Text
              style={{
                ...ui.muted,
                color: i + 1 === step ? colors.ink : colors.muted,
                flex: 1,
              }}
            >
              {i + 1}. {label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
