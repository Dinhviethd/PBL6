import { useCallback, useRef, useState } from "react";
import { AppState, Image, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { api } from "../lib/api";
import { errorMessage, money, when } from "../lib/data";
import { Button, Notice, ui } from "./ui";

export type SepayPayment = {
  paymentId: string;
  orderId: string;
  orderStatus: string;
  status: string;
  environment: "test" | "live";
  amount: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrUrl: string | null;
  canTransfer: boolean;
  expiresAt: string;
  requiresReview: boolean;
};
export function SepayCheckout({
  orderId,
  existing,
  onChange,
}: {
  orderId: string;
  existing: boolean;
  onChange: () => void;
}) {
  const [payment, setPayment] = useState<SepayPayment | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const locked = useRef(false);
  const hasPayment = existing || Boolean(payment);
  const refresh = useCallback(async () => {
    try {
      const data = await api.request<SepayPayment>(
        `/sepay/orders/${orderId}/payment`,
      );
      setPayment(data);
      setError("");
      if (data.orderStatus !== "PENDING_PAYMENT") onChange();
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [orderId, onChange]);
  useFocusEffect(
    useCallback(() => {
      let active = true,
        running = false;
      const until = Date.now() + 300000;
      const poll = async () => {
        if (
          !active ||
          running ||
          !hasPayment ||
          AppState.currentState === "background" ||
          Date.now() >= until
        )
          return;
        running = true;
        try {
          await refresh();
        } finally {
          running = false;
        }
      };
      void poll();
      const clock = setInterval(() => setNow(Date.now()), 1000),
        timer = setInterval(() => void poll(), 8000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          onChange();
          void poll();
        }
      });
      return () => {
        active = false;
        clearInterval(clock);
        clearInterval(timer);
        subscription.remove();
      };
    }, [hasPayment, refresh, onChange]),
  );
  async function start() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api.request<SepayPayment>(
        `/sepay/orders/${orderId}/payment`,
        "POST",
        {},
      );
      setPayment(data);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function copy(value: string, label: string) {
    try {
      await Clipboard.setStringAsync(value);
      setNotice(`Đã sao chép ${label.toLowerCase()}.`);
    } catch {
      setError(
        "Không sao chép được. Bạn có thể chọn và sao chép nội dung bên dưới.",
      );
    }
  }
  const transferable =
    payment?.canTransfer &&
    !payment.requiresReview &&
    payment.orderStatus === "PENDING_PAYMENT" &&
    Date.parse(payment.expiresAt) > now;
  return (
    <View style={ui.card}>
      <Text style={ui.h2}>Chuyển khoản MB Bank</Text>
      <Notice error text={error} />
      <Notice text={notice} />
      {payment ? (
        <>
          {payment.environment === "test" && (
            <Notice text="Môi trường kiểm thử · Không chuyển tiền thật." />
          )}
          {payment.requiresReview ? (
            <Notice
              error
              text="Giao dịch đang cần đối soát. Không chuyển khoản thêm; hãy liên hệ hỗ trợ."
            />
          ) : transferable ? (
            <>
              <Text style={ui.text}>Người nhận: {payment.accountName}</Text>
              <Text selectable style={ui.text}>
                Số tài khoản: {payment.accountNumber}
              </Text>
              <Button
                title="Sao chép số tài khoản"
                secondary
                onPress={() => void copy(payment.accountNumber, "Số tài khoản")}
              />
              <Text selectable style={ui.text}>
                Số tiền: {money(payment.amount)}
              </Text>
              <Button
                title="Sao chép số tiền"
                secondary
                onPress={() => void copy(payment.amount, "Số tiền")}
              />
              <Text selectable style={ui.text}>
                Nội dung: {payment.transferContent}
              </Text>
              <Button
                title="Sao chép nội dung chuyển khoản"
                secondary
                onPress={() =>
                  void copy(payment.transferContent, "Nội dung chuyển khoản")
                }
              />
              {payment.qrUrl?.startsWith("https://vietqr.app/") && (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                  }}
                >
                  <Image
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel="QR chuyển khoản MB Bank"
                    source={{ uri: payment.qrUrl }}
                    style={{ width: "100%", aspectRatio: 1 }}
                    resizeMode="contain"
                    onError={() =>
                      setError(
                        "Chưa tải được ảnh QR. Bạn vẫn có thể sao chép thông tin chuyển khoản.",
                      )
                    }
                  />
                </View>
              )}
              <Text style={ui.muted}>
                Dùng cùng điện thoại: sao chép thông tin, mở ứng dụng ngân hàng,
                rồi quay lại EventHub kiểm tra. Hạn thanh toán:{" "}
                {when(payment.expiresAt)}.
              </Text>
            </>
          ) : (
            <Notice text="Mã chuyển khoản không còn khả dụng. Hãy cập nhật trạng thái; không chuyển tiền theo mã cũ." />
          )}
          <Button
            title="Kiểm tra chuyển khoản"
            secondary
            disabled={busy}
            onPress={() => void refresh()}
          />
        </>
      ) : (
        <>
          <Text style={ui.text}>
            Tạo thông tin chuyển khoản theo đúng số tiền và hạn của đơn hàng.
          </Text>
          <Button
            title={
              busy
                ? "Đang tạo thông tin…"
                : existing
                  ? "Tải thông tin chuyển khoản"
                  : "Thanh toán qua MB Bank"
            }
            disabled={busy}
            onPress={() => void (existing ? refresh() : start())}
          />
        </>
      )}
    </View>
  );
}
