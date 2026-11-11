import { useState } from "react";
import { Platform, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { dayBoundary, vietnamDate } from "../lib/report-filters";
import { Button, ui } from "./ui";
export function DayField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.muted}>{label} · Giờ Việt Nam</Text>
      <Button
        title={`${label}: ${value || "Chọn ngày"}`}
        secondary
        onPress={() => setOpen(true)}
      />
      {open && (
        <DateTimePicker
          value={value ? new Date(dayBoundary(value)) : new Date()}
          mode="date"
          timeZoneName="Asia/Ho_Chi_Minh"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (event.type !== "dismissed" && date) onChange(vietnamDate(date));
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Button title="Xong" onPress={() => setOpen(false)} />
      )}
    </View>
  );
}
