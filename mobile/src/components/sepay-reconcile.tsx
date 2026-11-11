import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import { errorMessage } from "../lib/data";
import { HomeSheet } from "./home/primitives";
import { Button, Field, Notice, ui } from "./ui";
export function SepayReconcile({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false),
    [minutes, setMinutes] = useState("60"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run() {
    if (busy) return;
    if (
      !/^\d+$/.test(minutes) ||
      Number(minutes) < 5 ||
      Number(minutes) > 1440
    ) {
      setError("Nhập số phút từ 5 đến 1440.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.request("/admin/sepay/reconcile", "POST", {
        lookbackMinutes: Number(minutes),
      });
      setOpen(false);
      setNotice(
        "Máy chủ đã hoàn tất lượt đối soát. Hãy kiểm tra trạng thái giao dịch được cập nhật.",
      );
      onComplete();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Notice text={notice} />
      <Button
        title="Đối soát SePay API v2"
        secondary
        onPress={() => {
          setOpen(true);
          setError("");
        }}
      />
      <HomeSheet
        title="Xác nhận đối soát SePay"
        visible={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <Text style={ui.text}>
          Máy chủ sẽ đọc giao dịch SePay trong khoảng thời gian đã chọn và cập
          nhật kết quả đối soát. Kiểm tra lại môi trường và giao dịch trước khi
          tiếp tục.
        </Text>
        <Field
          label="Số phút đối soát gần nhất"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          editable={!busy}
          maxLength={4}
        />
        <Notice error text={error} />
        <Button
          title={busy ? "Đang đối soát…" : "Xác nhận chạy đối soát"}
          disabled={busy}
          onPress={() => void run()}
        />
      </HomeSheet>
    </View>
  );
}
