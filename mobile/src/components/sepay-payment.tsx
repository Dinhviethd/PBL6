import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Image, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { api } from "../lib/api";
import {
  canTransfer,
  createSepayController,
  type SepayPayment,
} from "../lib/sepay";
import { money, stateLabel, when } from "../lib/data";
import { Button, Notice, ui } from "./ui";

export function SepayPaymentPanel({
  orderId,
  enabled,
  onPaid,
  onBack,
}: {
  orderId: string;
  enabled: boolean;
  onPaid: () => void;
  onBack: () => void;
}) {
  const [state, setState] = useState({
    payment: null as SepayPayment | null,
    busy: false,
    error: "",
    checked: false,
    availableAt: 0,
  });
  const [now, setNow] = useState(Date.now);
  const [copied, setCopied] = useState("");
  const controller = useMemo(
    () =>
      createSepayController({
        request: (method) =>
          api.request<SepayPayment>(
            `/sepay/orders/${orderId}/payment`,
            method,
            method === "POST" ? {} : undefined,
          ),
        changed: setState,
        paid: onPaid,
      }),
    [orderId, onPaid],
  );
  useEffect(() => () => controller.dispose(), [controller]);
  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState === "active") void controller.activate();
      const subscription = AppState.addEventListener("change", (value) => {
        if (value === "active") void controller.activate();
        else controller.deactivate();
      });
      const timer = setInterval(() => {
        setNow(Date.now());
        void controller.tick();
      }, 1000);
      return () => {
        controller.deactivate();
        clearInterval(timer);
        subscription.remove();
      };
    }, [controller]),
  );
  const p = state.payment;
  const waiting = state.busy || now < state.availableAt;
  const transferable = !state.error && !state.busy && canTransfer(p, now);
  async function copy(value: string, label: string) {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(`Đã sao chép ${label}.`);
    } catch {
      setCopied("Không sao chép được. Vui lòng thử lại.");
    }
  }
  return (
    <View style={ui.card}>
      <Text style={ui.h2}>Chuyển khoản ngân hàng</Text>
      <Notice error text={state.error} />
      {p && (
        <>
          <Notice
            text={
              p.environment === "test"
                ? "Môi trường thử nghiệm · Không chuyển tiền thật."
                : "Chỉ chuyển đúng số tiền và nội dung khi mã còn hạn."
            }
          />
          <Text style={ui.text}>
            Đơn hàng: {stateLabel(p.orderStatus)} · Giao dịch:{" "}
            {p.status === "PENDING" ? "Chờ thanh toán" : stateLabel(p.status)}
          </Text>
          <Text style={ui.muted}>Hạn chuyển khoản: {when(p.expiresAt)}</Text>
          <Text style={ui.muted}>
            Giữ chỗ/đối soát đến: {when(p.holdUntil)}
          </Text>
          {p.requiresReview ? (
            <Notice
              error
              text="Giao dịch cần đối soát. Vui lòng liên hệ ban tổ chức; chưa phát hành vé."
            />
          ) : !transferable &&
            !state.busy &&
            !state.error &&
            p.orderStatus !== "PAID" ? (
            <Notice text="Không chuyển khoản theo giao dịch này. Hãy cập nhật trạng thái; vé chỉ xuất hiện khi máy chủ xác nhận đã thanh toán." />
          ) : null}
        </>
      )}
      {p && transferable && (
        <>
          <Text style={ui.text}>
            {p.bank} · {p.accountName}
          </Text>
          <Text selectable style={ui.text}>
            Số tài khoản: {p.accountNumber}
          </Text>
          <Text style={ui.h2}>{money(p.amount)}</Text>
          <Text selectable style={ui.text}>
            Nội dung: {p.transferContent}
          </Text>
          {p.qrUrl && (
            <Image
              accessibilityLabel="QR chuyển khoản ngân hàng"
              source={{ uri: p.qrUrl }}
              style={{ width: "100%", height: 260 }}
              resizeMode="contain"
            />
          )}
          <Button
            secondary
            title="Sao chép số tài khoản"
            onPress={() => void copy(p.accountNumber, "số tài khoản")}
          />
          <Button
            secondary
            title="Sao chép số tiền"
            onPress={() => void copy(p.amount, "số tiền")}
          />
          <Button
            secondary
            title="Sao chép nội dung"
            onPress={() => void copy(p.transferContent, "nội dung")}
          />
        </>
      )}
      <Notice text={copied} />
      {state.error && now < state.availableAt && (
        <Notice
          text={`Có thể thử lại sau ${Math.ceil((state.availableAt - now) / 1000)} giây.`}
        />
      )}
      {enabled && state.checked && !p && !state.error && (
        <Button
          title="Tạo giao dịch chuyển khoản"
          disabled={waiting}
          onPress={() => void controller.start()}
        />
      )}
      {state.checked && !p && !state.error && !state.busy && (
        <Button secondary title="Quay lại đơn hàng" onPress={onBack} />
      )}
      <Button
        secondary
        title={state.busy ? "Đang kiểm tra giao dịch…" : "Kiểm tra giao dịch"}
        disabled={waiting}
        onPress={() => void controller.refresh()}
      />
    </View>
  );
}
