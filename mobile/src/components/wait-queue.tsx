import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect, usePathname } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { errorMessage, useResource, when } from "../lib/data";
import { Button, Notice, Pager, ui } from "./ui";
import type { WaitEntry } from "../../../client/src/features/ticketing/wait-queue-data";

const labels = {
  WAITING: "Đang chờ",
  OFFERED: "Đã giữ vé cho bạn",
  COMPLETED: "Đã mua vé",
  EXPIRED: "Hết hạn lời mời",
  CANCELLED: "Đã rời / đóng hàng chờ",
};

export function JoinWaitQueue({
  eventId,
  typeId,
  name,
}: {
  eventId: string;
  typeId: string;
  name: string;
}) {
  const { user } = useSession(),
    pathname = usePathname();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function join() {
    if (!user) {
      router.push({ pathname: "/auth", params: { next: pathname } });
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.request(`/events/${eventId}/wait-queue`, "POST", {
        ticketTypeId: typeId,
      });
      router.push("/(tabs)/orders");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Button
        secondary
        title={`Chờ vé ${name}`}
        disabled={busy}
        onPress={() => void join()}
      />
      <Text style={ui.muted}>
        Chờ 1 vé; thông báo trong ứng dụng khi đến lượt.
      </Text>
      <Notice error text={error} />
    </View>
  );
}

export function MyWaitQueue() {
  const { user } = useSession();
  const [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = useResource<WaitEntry[]>(
      user ? `/me/wait-queue?page=${page}` : null,
    ),
    reload = r.reload;
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(reload, 30000);
      return () => clearInterval(timer);
    }, [reload]),
  );
  async function leave(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.request(`/me/wait-queue/${id}`, "DELETE");
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.h2}>Danh sách chờ vé</Text>
      <Text style={ui.muted}>
        Mỗi lượt chờ 1 vé. Khi đến lượt, vé được giữ tối đa 15 phút. Không bảo
        đảm sẽ có vé.
      </Text>
      <Notice error text={error || r.error} />
      <Button secondary title="Cập nhật hàng chờ" onPress={reload} />
      {!r.loading && !r.error && !r.data?.length && (
        <Text style={ui.muted}>Bạn chưa đăng ký chờ vé.</Text>
      )}
      {r.data?.map((w) => (
        <View style={ui.card} key={w.id}>
          <Text style={ui.h2}>
            {w.event_title} — {w.type_name}
          </Text>
          <Text style={ui.text}>
            {labels[w.status]}
            {w.status === "WAITING" ? ` · Vị trí ${w.position}` : ""}
          </Text>
          {w.status === "OFFERED" && w.expires_at && (
            <Text style={ui.muted}>
              Bắt đầu thanh toán trước {when(w.expires_at)}.
            </Text>
          )}
          {w.order_id && (
            <Button
              title="Xem đơn giữ vé"
              onPress={() =>
                router.push({
                  pathname: "/orders/[id]",
                  params: { id: w.order_id! },
                })
              }
            />
          )}
          {["WAITING", "OFFERED"].includes(w.status) && (
            <Button
              secondary
              title={w.status === "OFFERED" ? "Từ chối vé" : "Rời hàng chờ"}
              disabled={busy}
              onPress={() => void leave(w.id)}
            />
          )}
        </View>
      ))}
      <Pager page={page} setPage={setPage} more={r.data?.length === 50} />
    </View>
  );
}
