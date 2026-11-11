import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { errorMessage, when } from "../lib/data";
import { usePagedResource } from "../lib/paged-resource";
import { LoadMore } from "../components/load-more";
import { IconBadge, type IconName } from "../components/app-icon";
import { EmptyState, InfoLine } from "../components/mobile-patterns";
import {
  Button,
  Loading,
  Notice,
  RequireAuth,
  ui,
  colors,
} from "../components/ui";
import type {
  InboxNotification,
  NotificationInbox,
} from "../../../client/src/features/ticketing/notifications-data";

const notificationLabels = {
  WAIT_QUEUE_OFFER: "Đến lượt mua vé",
  ORDER_PAID: "Vé của bạn",
  STAFF_INVITED: "Lời mời",
  EVENT_UPDATED: "Cập nhật sự kiện",
  EVENT_REMINDER: "Nhắc lịch",
};
const notificationIcons: Record<keyof typeof notificationLabels, IconName> = {
  WAIT_QUEUE_OFFER: "clock",
  ORDER_PAID: "tag",
  STAFF_INVITED: "users",
  EVENT_UPDATED: "calendar",
  EVENT_REMINDER: "bell",
};
const notificationPages = {
  items: (data: NotificationInbox) => data.items,
  more: (data: NotificationInbox) => data.hasNext,
  key: (notification: InboxNotification) => notification.id,
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSession(),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = usePagedResource(
    user ? `/me/notifications?unread=${unread}` : null,
    notificationPages,
  );
  const reload = r.refreshLoaded;
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
        r.refreshLoaded(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireAuth>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 24 + insets.bottom,
          gap: 18,
          width: "100%",
          maxWidth: 620,
          alignSelf: "center",
        }}
        data={r.items}
        keyExtractor={(notification) => notification.id}
        refreshing={r.loading}
        onRefresh={r.reload}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
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
                }}
              />
              <Button
                title="Chưa đọc"
                secondary={!unread}
                onPress={() => {
                  setUnread(true);
                }}
              />
            </View>
            <Button
              title="Đánh dấu tất cả đã đọc"
              icon="check-circle"
              secondary
              disabled={busy || !r.data?.unreadCount}
              onPress={() => void read()}
            />
            <Notice error text={error} />
          </View>
        }
        ListEmptyComponent={
          r.loading ? (
            <Loading />
          ) : !r.error ? (
            <EmptyState
              icon="bell"
              title={unread ? "Bạn đã cập nhật tất cả" : "Hộp thư đang trống"}
              description={
                unread
                  ? "Bạn đã đọc hết thông báo trên trang này."
                  : "Chưa có thông báo. Những cập nhật mới sẽ xuất hiện tại đây."
              }
            />
          ) : null
        }
        renderItem={({ item: n }) => (
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
              <IconBadge name={notificationIcons[n.kind]} />
              <Text style={ui.badge}>{notificationLabels[n.kind]}</Text>
              {!n.read_at && <Text style={ui.badge}>Chưa đọc</Text>}
            </View>
            <Text style={ui.h2}>{n.title}</Text>
            <Text style={ui.text}>{n.message}</Text>
            <InfoLine icon="clock" text={when(n.created_at)} />
            <Button
              icon={
                n.target === "ORDER"
                  ? "shopping-bag"
                  : n.target === "STAFF"
                    ? "users"
                    : "tag"
              }
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
                icon="check"
                secondary
                disabled={busy}
                onPress={() => void read(n)}
              />
            )}
          </View>
        )}
        ListFooterComponent={
          <LoadMore
            more={r.more}
            loading={r.loadingMore}
            error={r.error}
            onLoadMore={r.loadMore}
            onRetry={r.retry}
          />
        }
      />
    </RequireAuth>
  );
}
