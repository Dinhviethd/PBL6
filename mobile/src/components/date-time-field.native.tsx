import { useState } from "react";
import { Platform, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, ui } from "./ui";
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const date =
    value && Number.isFinite(Date.parse(value)) ? new Date(value) : new Date();
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.muted}>{label} · Giờ Việt Nam</Text>
      <Text style={ui.text}>
        {value
          ? new Intl.DateTimeFormat("vi-VN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(date)
          : "Chưa chọn ngày giờ"}
      </Text>
      <Button
        title={`Chọn ngày — ${label}`}
        secondary
        onPress={() => setMode("date")}
      />
      <Button
        title={`Chọn giờ — ${label}`}
        secondary
        onPress={() => setMode("time")}
      />
      {mode && (
        <DateTimePicker
          value={date}
          mode={mode}
          timeZoneName="Asia/Ho_Chi_Minh"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            if (Platform.OS !== "ios") setMode(null);
            if (event.type !== "dismissed" && selected)
              onChange(selected.toISOString());
          }}
        />
      )}
      {mode && Platform.OS === "ios" && (
        <Button title="Xong" onPress={() => setMode(null)} />
      )}
    </View>
  );
}
