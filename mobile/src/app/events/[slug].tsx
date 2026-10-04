import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import * as Crypto from "expo-crypto";
import { api, mediaUrl } from "../../lib/api";
import { useSession } from "../../lib/session";
import {
  errorMessage,
  money,
  useResource,
  when,
  type Event,
  type Order,
} from "../../lib/data";
import { Button, Loading, Notice, Screen, ui } from "../../components/ui";
export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>(),
    pathname = usePathname(),
    { user } = useSession();
  const r = useResource<Event>(`/events/${encodeURIComponent(slug)}`);
  const [quantities, setQuantities] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const retry = useRef({ signature: "", key: "" }),
    submitting = useRef(false);
  const event = r.data,
    types = event?.ticketTypes ?? [],
    count = Object.values(quantities).reduce((sum, n) => sum + n, 0);
  const total = types.reduce(
    (sum, t) => sum + Number(t.price_amount) * (quantities[t.id] ?? 0),
    0,
  );
  async function buy() {
    if (!user) {
      router.push({ pathname: "/auth", params: { next: pathname } });
      return;
    }
    if (!event || !count || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const body = {
      eventId: event.id,
      items: types
        .filter((t) => quantities[t.id] > 0)
        .map((t) => ({ ticketTypeId: t.id, quantity: quantities[t.id] })),
    };
    const signature = JSON.stringify(body);
    if (retry.current.signature !== signature)
      retry.current = { signature, key: Crypto.randomUUID() };
    try {
      const order = await api.request<Order>("/orders", "POST", body, {
        "Idempotency-Key": retry.current.key,
      });
      setQuantities({});
      retry.current = { signature: "", key: "" };
      router.push({ pathname: "/orders/[id]", params: { id: order.id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Notice error text={r.error} />
      {r.loading && !event ? (
        <Loading />
      ) : (
        event && (
          <>
            {event.cover_image_url && (
              <Image
                source={{ uri: mediaUrl(event.cover_image_url) }}
                style={ui.image}
              />
            )}
            <Text style={ui.eyebrow}>{event.city_code}</Text>
            <Text style={ui.title}>{event.title}</Text>
            <Text style={ui.text}>{when(event.starts_at)}</Text>
            <Text style={ui.muted}>
              {event.venue_name} · {event.address}
            </Text>
            <Text style={ui.text}>{event.description}</Text>
            <Text style={ui.h2}>Chọn vé của bạn</Text>
            <Text style={ui.muted}>
              Mỗi đơn tối đa 10 vé. Giá và chỗ trống được kiểm tra lại khi đặt.
            </Text>
            {types.map((t) => {
              const qty = quantities[t.id] ?? 0,
                available = t.capacity - t.sold_quantity - t.reserved_quantity,
                open =
                  !event.sales_paused &&
                  new Date(event.ends_at) > new Date() &&
                  new Date(t.sale_starts_at) <= new Date() &&
                  new Date(t.sale_ends_at) > new Date();
              return (
                <View style={ui.card} key={t.id}>
                  <Text style={ui.h2}>{t.name}</Text>
                  <Text style={ui.text}>{money(t.price_amount)}</Text>
                  {t.description && (
                    <Text style={ui.muted}>{t.description}</Text>
                  )}
                  <Text style={ui.muted}>
                    {open ? `Còn ${available} vé` : "Chưa mở hoặc đã ngừng bán"}
                  </Text>
                  <View style={{ ...ui.row, justifyContent: "space-between" }}>
                    <Button
                      title={`Giảm ${t.name}`}
                      secondary
                      disabled={busy || qty === 0}
                      onPress={() =>
                        setQuantities((v) => ({ ...v, [t.id]: qty - 1 }))
                      }
                    />
                    <Text
                      accessibilityLabel={`Số lượng ${t.name}`}
                      style={ui.h2}
                    >
                      {qty}
                    </Text>
                    <Button
                      title={`Thêm ${t.name}`}
                      secondary
                      disabled={
                        busy || !open || qty >= available || count >= 10
                      }
                      onPress={() =>
                        setQuantities((v) => ({ ...v, [t.id]: qty + 1 }))
                      }
                    />
                  </View>
                </View>
              );
            })}
            <View style={ui.card}>
              <Text style={ui.h2}>Tạm tính: {money(total)}</Text>
              <Notice error text={error} />
              <Button
                title={
                  busy
                    ? "Đang giữ chỗ…"
                    : user
                      ? `Đặt ${count} vé`
                      : "Đăng nhập để đặt vé"
                }
                disabled={busy || (!!user && count === 0)}
                onPress={() => void buy()}
              />
            </View>
          </>
        )
      )}
    </Screen>
  );
}
