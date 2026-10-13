import { useCallback, useState } from "react";
import { AppState, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { checkoutUrl, paymentMessage } from "../../lib/payment";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import {
  errorMessage,
  money,
  stateLabel,
  useResource,
  when,
  type Order,
  type Payment,
} from "../../lib/data";
import {
  Button,
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
} from "../../components/ui";
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useSession(),
    r = useResource<Order>(user ? `/me/orders/${id}` : null),
    config = useResource<{ paymentMode: string }>("/config");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(""),
    [now, setNow] = useState(() => Date.now());
  const order = r.data,
    pending = order?.status === "PENDING_PAYMENT",
    payment = order?.payment;
  const reloadOrder = r.reload,
    paymentId = payment?.id;
  useFocusEffect(
    useCallback(() => {
      if (!pending) return;
      const until = Date.now() + 60000;
      const clock = setInterval(() => setNow(Date.now()), 1000),
        poll = paymentId
          ? setInterval(() => {
              if (Date.now() < until) reloadOrder();
              else clearInterval(poll);
            }, 3000)
          : undefined;
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") reloadOrder();
      });
      return () => {
        clearInterval(clock);
        clearInterval(poll);
        subscription.remove();
      };
    }, [pending, paymentId, reloadOrder]),
  );
  async function act(action: "start" | "cancel" | "success" | "failure") {
    setBusy(true);
    setError("");
    setResult("");
    try {
      if (action === "start") {
        const attempt = await api.request<Payment>(
          `/orders/${id}/payments`,
          "POST",
          {},
        );
        if (attempt.provider === "vnpay_sandbox")
          await Linking.openURL(checkoutUrl(attempt.checkout_url));
      } else if (action === "cancel")
        await api.request(`/orders/${id}/cancel`, "POST", {});
      else if (payment) {
        const r = await api.request<{ outcome: string }>(
          `/payments/${payment.id}/demo`,
          "POST",
          { success: action === "success" },
        );
        if (
          ["LATE_PAYMENT", "DIFFERENT_PAYMENT_ALREADY_APPLIED"].includes(
            r.outcome,
          )
        )
          setResult(
            "Giao dịch cần đối soát. Vui lòng liên hệ ban tổ chức; chưa có vé mới được phát hành.",
          );
        if (r.outcome === "FAILED")
          setResult("Thanh toán thất bại. Bạn có thể thử lại nếu đơn còn hạn.");
      }
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const seconds = order
    ? Math.max(
        0,
        Math.ceil((new Date(order.expires_at).getTime() - now) / 1000),
      )
    : 0;
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Notice error text={r.error || error} />
        <Notice text={result} />
        <Notice text={paymentMessage(order?.latest_payment)} />
        {r.loading && !order ? (
          <Loading />
        ) : (
          order && (
            <>
              <Text style={ui.badge}>{stateLabel(order.status)}</Text>
              <Text style={ui.title}>{order.event_title_snapshot}</Text>
              <Text style={ui.muted}>{order.order_code}</Text>
              <View style={ui.card}>
                {order.items?.map((i, n) => (
                  <View key={n} style={ui.row}>
                    <Text style={{ ...ui.text, flex: 1 }}>
                      {i.ticket_type_name_snapshot} × {i.quantity}
                    </Text>
                    <Text style={ui.text}>{money(i.line_total)}</Text>
                  </View>
                ))}
                <Text style={ui.h2}>Tổng: {money(order.total_amount)}</Text>
              </View>
              {pending && (
                <Notice
                  text={
                    seconds > 0
                      ? `Giữ chỗ còn ${Math.floor(seconds / 60)} phút ${seconds % 60} giây · hết hạn ${when(order.expires_at)}`
                      : "Đã hết thời gian giữ chỗ. Đang chờ máy chủ cập nhật trạng thái."
                  }
                />
              )}
              {order.status === "PAID" && (
                <Button
                  title="Mở ví vé QR"
                  onPress={() => router.push("/tickets")}
                />
              )}
              {payment?.requires_review && (
                <Notice
                  error
                  text="Giao dịch cần đối soát. Vui lòng liên hệ ban tổ chức."
                />
              )}
              {pending && seconds > 0 && (
                <>
                  {config.data?.paymentMode === "demo" ? (
                    <Notice text="Thanh toán demo · Không thu tiền thật." />
                  ) : config.data?.paymentMode === "vnpay_sandbox" ? (
                    <Notice text="VNPay Sandbox · Chỉ dùng thông tin thanh toán thử." />
                  ) : (
                    <Notice text="Thanh toán chưa được bật. Bạn có thể quay lại sau hoặc hủy đơn." />
                  )}
                  {!payment && config.data?.paymentMode === "demo" && (
                    <Button
                      title="Tiếp tục thanh toán"
                      disabled={busy}
                      onPress={() => void act("start")}
                    />
                  )}
                  {config.data?.paymentMode === "vnpay_sandbox" && (
                    <Button
                      title="Thanh toán qua VNPay"
                      disabled={
                        busy ||
                        Boolean(
                          payment?.provider_expires_at &&
                          Date.parse(payment.provider_expires_at) <= now,
                        )
                      }
                      onPress={() => void act("start")}
                    />
                  )}
                  {payment?.status === "PENDING" &&
                    config.data?.paymentMode === "demo" && (
                      <>
                        <Button
                          title="Mô phỏng thanh toán thành công"
                          disabled={busy}
                          onPress={() => void act("success")}
                        />
                        <Button
                          title="Mô phỏng thanh toán thất bại"
                          secondary
                          disabled={busy}
                          onPress={() => void act("failure")}
                        />
                      </>
                    )}
                  {!payment && (
                    <Button
                      title="Hủy đơn chưa thanh toán"
                      secondary
                      disabled={busy}
                      onPress={() => void act("cancel")}
                    />
                  )}
                </>
              )}
              <Button
                title="Cập nhật trạng thái"
                secondary
                disabled={r.loading || busy}
                onPress={r.reload}
              />
            </>
          )
        )}
      </Screen>
    </RequireAuth>
  );
}
