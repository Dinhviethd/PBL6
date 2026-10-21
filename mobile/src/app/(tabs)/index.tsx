import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { EventArtwork } from "../../components/event-artwork";
import {
  money,
  useResource,
  when,
  type Category,
  type Event,
} from "../../lib/data";
import {
  Button,
  Field,
  Loading,
  Notice,
  Pager,
  Screen,
  colors,
  ui,
  fonts,
} from "../../components/ui";
export default function ExploreScreen() {
  const [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [filter, setFilter] = useState({ q: "", city: "" }),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(0);
  const categories = useResource<Category[]>("/categories"),
    config = useResource<{ paymentMode: string }>("/config"),
    events = useResource<{ items: Event[]; total: number }>(
      `/events?q=${encodeURIComponent(filter.q)}&city=${encodeURIComponent(filter.city)}${category ? `&category=${category}` : ""}&page=${page}`,
    );
  return (
    <Screen refresh={events.reload} loading={events.loading}>
      <View style={{ ...ui.card, backgroundColor: colors.accentSurface }}>
        <Text style={ui.eyebrow}>TÌM TRẢI NGHIỆM TIẾP THEO</Text>
        <Text style={ui.title}>Đi đâu{"\n"}cuối tuần này?</Text>
        <Text style={ui.muted}>
          Âm nhạc, gặp gỡ và những khoảnh khắc đáng nhớ.
        </Text>
        {events.data?.items[0] && !events.loading && (
          <>
            <EventArtwork
              url={events.data.items[0].cover_image_url}
              title={events.data.items[0].title}
              hero
            />
            <Text style={ui.h2}>{events.data.items[0].title}</Text>
            <Text style={ui.muted}>
              {when(events.data.items[0].starts_at)} ·{" "}
              {events.data.items[0].city_code}
            </Text>
            <Button
              title="Khám phá sự kiện"
              onPress={() =>
                router.push({
                  pathname: "/events/[slug]",
                  params: { slug: events.data!.items[0].slug },
                })
              }
            />
          </>
        )}
      </View>
      {config.data?.paymentMode === "demo" && (
        <Notice text="Bản trải nghiệm · Thanh toán demo, không thu tiền thật." />
      )}
      <Field
        label="Tìm sự kiện"
        value={q}
        onChangeText={setQ}
        placeholder="Tên sự kiện bạn quan tâm"
        returnKeyType="search"
        onSubmitEditing={() => {
          setFilter({ q, city });
          setPage(0);
        }}
      />
      <Field
        label="Thành phố"
        value={city}
        onChangeText={setCity}
        placeholder="Ví dụ: Đà Nẵng"
      />
      <Button
        title="Tìm kiếm"
        onPress={() => {
          setFilter({ q, city });
          setPage(0);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[{ id: "", name: "Tất cả" }, ...(categories.data ?? [])].map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={c.name}
            accessibilityState={{ selected: category === c.id }}
            onPress={() => {
              setCategory(c.id);
              setPage(0);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 48,
              justifyContent: "center",
              borderRadius: 30,
              backgroundColor:
                category === c.id ? colors.primary : colors.surface,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                color: category === c.id ? colors.onPrimary : colors.ink,
              }}
            >
              {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={ui.h2}>Sự kiện dành cho bạn</Text>
      <Notice error text={events.error || categories.error} />
      {events.loading ? (
        <Loading />
      ) : !events.data?.items.length ? (
        <Text style={ui.muted}>
          Chưa có sự kiện phù hợp. Hãy thử bộ lọc khác.
        </Text>
      ) : (
        events.data.items.map((e) => (
          <View style={ui.card} key={e.id}>
            <EventArtwork url={e.cover_image_url} title={e.title} />
            <Text style={ui.badge}>{e.city_code}</Text>
            <Text style={ui.h2}>{e.title}</Text>
            <Text style={ui.muted}>
              {when(e.starts_at)} · {e.venue_name}
            </Text>
            <Text
              style={{
                ...ui.text,
                fontFamily: fonts.bold,
                color: colors.primary,
              }}
            >
              {e.priceFrom == null
                ? "Xem chi tiết giá vé"
                : `Từ ${money(e.priceFrom)}`}
            </Text>
            <Button
              title={`Xem sự kiện: ${e.title}`}
              secondary
              onPress={() =>
                router.push({
                  pathname: "/events/[slug]",
                  params: { slug: e.slug },
                })
              }
            />
          </View>
        ))
      )}
      <Pager
        page={page}
        setPage={setPage}
        more={(page + 1) * 24 < (events.data?.total ?? 0)}
      />
    </Screen>
  );
}
