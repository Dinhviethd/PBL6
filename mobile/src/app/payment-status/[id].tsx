import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSession } from "../../lib/session";
import { money, useResource } from "../../lib/data";
import {
  Button,
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
} from "../../components/ui";
type PaidOrder = {
  id: string;
  status: string;
  order_code: string;
  event_title_snapshot: string;
  total_amount: string;
  tickets: { issued: number; expected: number };
};
export default function PaymentStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useSession();
  const r = useResource<PaidOrder>(user ? `/me/order-history/${id}` : null);
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        {r.loading && !r.data ? (
          <Loading />
        ) : r.error ? (
          <>
            <Notice error text={r.error} />
            <Button title="Thử lại" onPress={r.reload} />
          </>
        ) : (
          r.data && (
            <>
              <Text style={ui.eyebrow}>KẾT QUẢ TỪ MÁY CHỦ</Text>
              <Text style={ui.title}>
                {r.data.status === "PAID"
                  ? "Thanh toán thành công"
                  : "Chưa xác nhận thanh toán"}
              </Text>
              <View style={ui.card}>
                <Text style={ui.h2}>{r.data.event_title_snapshot}</Text>
                <Text style={ui.text}>{r.data.order_code}</Text>
                <Text style={ui.text}>{money(r.data.total_amount)}</Text>
              </View>
              {r.data.status === "PAID" ? (
                <>
                  <Notice
                    text={`Đã phát hành ${r.data.tickets.issued}/${r.data.tickets.expected} vé. ${r.data.tickets.issued < r.data.tickets.expected ? "Vé đang được cập nhật; hãy kiểm tra lại." : "Bạn có thể mở mã QR trong ví vé."}`}
                  />
                  <Button
                    title="Mở ví vé QR"
                    onPress={() => router.push("/tickets")}
                  />
                </>
              ) : (
                <Notice text="Chỉ hiển thị vé hợp lệ sau khi máy chủ xác nhận thanh toán. Việc quay lại từ ngân hàng chưa xác nhận giao dịch thành công." />
              )}
              <Button
                title="Kiểm tra lại kết quả"
                secondary
                onPress={r.reload}
              />
              <Button
                title="Xem đơn hàng"
                secondary
                onPress={() =>
                  router.replace({ pathname: "/orders/[id]", params: { id } })
                }
              />
            </>
          )
        )}
      </Screen>
    </RequireAuth>
  );
}
