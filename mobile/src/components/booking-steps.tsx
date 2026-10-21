import { Text, View } from "react-native";
import { colors, ui } from "./ui";

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
          <Text
            style={{
              ...ui.muted,
              color: i + 1 === step ? colors.ink : colors.muted,
            }}
          >
            {i + 1}. {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
