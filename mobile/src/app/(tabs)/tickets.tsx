import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { stateLabel, useResource, type Ticket } from "../../lib/data";
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
export default function TicketsScreen() {
  const { user } = useSession(),
    [page, setPage] = useState(0),
    r = useResource<Ticket[]>(user ? `/me/tickets?page=${page}` : null);
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Text style={ui.eyebrow}>NHỮNG CUỘC HẸN SẮP TỚI</Text>
        <Text style={ui.title}>Ví vé của bạn.</Text>
        <Notice error text={r.error} />
        {r.loading ? (
          <Loading />
        ) : !r.data?.length ? (
          <Text style={ui.muted}>
            Vé sẽ xuất hiện ở đây sau khi thanh toán thành công.
          </Text>
        ) : (
          r.data.map((t) => (
            <View style={ui.card} key={t.id}>
              <Text style={ui.badge}>{stateLabel(t.status)}</Text>
              <Text style={ui.h2}>{t.event_title_snapshot}</Text>
              <Text style={ui.muted}>{t.ticket_type_name_snapshot}</Text>
              <Text style={ui.text}>{t.ticket_code}</Text>
              <Button
                title={`Mở vé ${t.ticket_code}`}
                onPress={() =>
                  router.push({
                    pathname: "/tickets/[id]",
                    params: { id: t.id },
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
