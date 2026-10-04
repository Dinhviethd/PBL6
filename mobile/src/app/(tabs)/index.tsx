import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { mediaUrl } from "../../lib/api";
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
      <View
        style={{
          ...ui.card,
          backgroundColor: colors.green,
          borderWidth: 0,
          paddingVertical: 28,
        }}
      >
        <Text style={{ ...ui.eyebrow, color: colors.lime }}>
          TÌM TRẢI NGHIỆM TIẾP THEO
        </Text>
        <Text style={{ ...ui.title, color: colors.white }}>
          Đi đâu{"\n"}cuối tuần này?
        </Text>
        <Text style={{ ...ui.text, color: "#d7e4d6" }}>
          Âm nhạc, gặp gỡ và những khoảnh khắc đáng nhớ.
        </Text>
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
            onPress={() => {
              setCategory(c.id);
              setPage(0);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 30,
              backgroundColor: category === c.id ? colors.ink : "#e6ecdf",
            }}
          >
            <Text style={{ color: category === c.id ? "white" : colors.ink }}>
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
            {e.cover_image_url && (
              <Image
                accessibilityLabel={e.title}
                source={{ uri: mediaUrl(e.cover_image_url) }}
                style={ui.image}
              />
            )}
            <Text style={ui.badge}>{e.city_code}</Text>
            <Text style={ui.h2}>{e.title}</Text>
            <Text style={ui.muted}>
              {when(e.starts_at)} · {e.venue_name}
            </Text>
            <Text style={{ ...ui.text, fontWeight: "700" }}>
              Từ {money(e.priceFrom ?? 0)}
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
