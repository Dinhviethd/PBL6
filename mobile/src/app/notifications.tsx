import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { errorMessage, useResource, when } from "../lib/data";
import {
  Button,
  Loading,
  Notice,
  Pager,
  RequireAuth,
  Screen,
  ui,
  colors,
} from "../components/ui";
import type {
  InboxNotification,
  NotificationInbox,
} from "../../../client/src/features/ticketing/notifications-data";

const notificationLabels = {
  ORDER_PAID: "Vé của bạn",
  STAFF_INVITED: "Lời mời",
  EVENT_UPDATED: "Cập nhật sự kiện",
  EVENT_REMINDER: "Nhắc lịch",
};

export default function NotificationsScreen() {
  const { user } = useSession(),
    [page, setPage] = useState(0),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = useResource<NotificationInbox>(
    user ? `/me/notifications?page=${page}&unread=${unread}` : null,
  );
  const reload = r.reload;
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(reload, 30000);
      return () => clearInterval(timer);
    }, [reload]),
  );
  async function read(n?: InboxNotification, open = false) {
    setBusy(true);
    setError("");
    try {
      if (!n?.read_at)
        await api.request(
          n ? `/me/notifications/${n.id}/read` : "/me/notifications/read-all",
          "POST",
        );
      if (open && n) {
        if (n.target === "ORDER")
          router.push({
            pathname: "/orders/[id]",
            params: { id: n.target_id },
          });
        else
          router.push(
            n.target === "STAFF" ? "/(tabs)/staff" : "/(tabs)/tickets",
          );
      } else {
        if (!n) setPage(0);
        r.reload();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Text style={ui.eyebrow}>LUÔN CẬP NHẬT</Text>
        <Text style={ui.title}>Thông báo của bạn.</Text>
        <Text style={ui.muted}>
          Nhắc lịch xuất hiện trong 24 giờ trước sự kiện.{" "}
          {r.data?.unreadCount ?? 0} thông báo chưa đọc.
        </Text>
        <View style={ui.row}>
          <Button
            title="Tất cả"
            secondary={unread}
            onPress={() => {
              setUnread(false);
              setPage(0);
            }}
          />
          <Button
            title="Chưa đọc"
            secondary={!unread}
            onPress={() => {
              setUnread(true);
              setPage(0);
            }}
          />
        </View>
        <Button
          title="Đánh dấu tất cả đã đọc"
          secondary
          disabled={busy || !r.data?.unreadCount}
          onPress={() => void read()}
        />
        <Notice error text={error || r.error} />
        {r.error && <Button title="Thử lại" secondary onPress={r.reload} />}
        {r.loading ? (
          <Loading />
        ) : r.error ? null : !r.data?.items.length ? (
          <Text style={ui.muted}>
            {unread
              ? "Bạn đã đọc hết thông báo trên trang này."
              : "Chưa có thông báo. Những cập nhật mới sẽ xuất hiện tại đây."}
          </Text>
        ) : (
          r.data.items.map((n) => (
            <View
              key={n.id}
              style={[
                ui.card,
                !n.read_at && {
                  backgroundColor: colors.accentSurface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <View style={ui.row}>
                <Text style={ui.badge}>{notificationLabels[n.kind]}</Text>
                {!n.read_at && <Text style={ui.badge}>Chưa đọc</Text>}
              </View>
              <Text style={ui.h2}>{n.title}</Text>
              <Text style={ui.text}>{n.message}</Text>
              <Text style={ui.muted}>{when(n.created_at)}</Text>
              <Button
                title={
                  n.target === "ORDER"
                    ? "Xem đơn hàng"
                    : n.target === "STAFF"
                      ? "Xem phân công"
                      : "Xem vé của tôi"
                }
                disabled={busy}
                onPress={() => void read(n, true)}
              />
              {!n.read_at && (
                <Button
                  title="Đánh dấu đã đọc"
                  secondary
                  disabled={busy}
                  onPress={() => void read(n)}
                />
              )}
            </View>
          ))
        )}
        <Pager page={page} setPage={setPage} more={r.data?.hasNext ?? false} />
      </Screen>
    </RequireAuth>
  );
}
