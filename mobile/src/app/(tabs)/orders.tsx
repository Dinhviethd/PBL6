import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  money,
  stateLabel,
  useResource,
  when,
  type Order,
} from "../../lib/data";
import { useSession } from "../../lib/session";
import {
  Button,
  Loading,
  Notice,
  Pager,
  RequireAuth,
  Screen,
  ui,
} from "../../components/ui";
export default function OrdersScreen() {
  const { user } = useSession(),
    [page, setPage] = useState(0),
    r = useResource<Order[]>(user ? `/me/orders?page=${page}` : null);
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Text style={ui.title}>Lịch sử đặt vé.</Text>
        <Notice error text={r.error} />
        {r.loading ? (
          <Loading />
        ) : !r.data?.length ? (
          <Text style={ui.muted}>Bạn chưa có đơn hàng.</Text>
        ) : (
          r.data.map((o) => (
            <View style={ui.card} key={o.id}>
              <Text style={ui.badge}>{stateLabel(o.status)}</Text>
              <Text style={ui.h2}>{o.event_title_snapshot}</Text>
              <Text style={ui.muted}>
                {o.order_code} · {when(o.created_at)}
              </Text>
              <Text style={ui.text}>
                {o.total_quantity} vé · {money(o.total_amount)}
              </Text>
              <Button
                title={`Xem đơn ${o.order_code}`}
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/orders/[id]",
                    params: { id: o.id },
                  })
                }
              />
            </View>
          ))
        )}
        <Pager page={page} setPage={setPage} more={r.data?.length === 50} />
      </Screen>
    </RequireAuth>
  );
}
