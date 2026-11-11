import { useRef, useState } from "react";
import { FlatList, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResource, type Category, type Event } from "../lib/data";
import {
  emptyEventFilters,
  eventQuery,
  type EventFilters,
} from "../lib/event-search";
import { HomeSearchPanel } from "../components/home/search-panel";
import { HomeEventCard } from "../components/home/event-card";
import { HomeButton, ResourceState } from "../components/home/primitives";
import { homeColors as c, homeStyles as s } from "../theme/home";
import { usePagedResource } from "../lib/paged-resource";
import { LoadMore } from "../components/load-more";

type EventPage = { items: Event[]; total: number };
const eventPages = {
  items: (data: EventPage) => data.items,
  more: (data: EventPage, page: number) => (page + 1) * 24 < data.total,
  key: (event: Event) => event.id,
};

export default function ExploreScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const initial = Object.fromEntries(
    Object.keys(emptyEventFilters).map((key) => [
      key,
      typeof params[key] === "string" ? params[key] : "",
    ]),
  ) as EventFilters;
  return <ExploreResults key={JSON.stringify(initial)} initial={initial} />;
}

function ExploreResults({ initial }: { initial: EventFilters }) {
  const list = useRef<FlatList<Event>>(null);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  let query = "";
  let invalid = "";
  try {
    query = eventQuery(filters);
  } catch (e) {
    invalid = (e as Error).message;
  }
  const categories = useResource<Category[]>("/categories");
  const events = usePagedResource(
    invalid ? null : `/events?${query}`,
    eventPages,
  );
  const category = categories.data?.find(
    (value) => value.id === filters.category,
  );
  return (
    <FlatList
      testID="event-results"
      ref={list}
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        width: "100%",
        maxWidth: 680,
        alignSelf: "center",
        padding: width < 360 ? 12 : 16,
        gap: 18,
        paddingBottom: 30 + insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
      data={invalid ? [] : events.items}
      onEndReached={events.loadMore}
      onEndReachedThreshold={0.35}
      keyExtractor={(event) => event.id}
      renderItem={({ item }) => <HomeEventCard event={item} />}
      refreshing={events.loading || categories.loading}
      onRefresh={() => {
        events.reload();
        categories.reload();
      }}
      ListHeaderComponent={
        <View style={{ gap: 18 }}>
          <Text accessibilityRole="header" style={s.title}>
            Tìm trải nghiệm tiếp theo
          </Text>
          <HomeSearchPanel
            filters={draft}
            onChange={setDraft}
            categories={categories.data ?? []}
            onSearch={(values) => {
              try {
                eventQuery(values);
                setDraft(values);
                setFilters(values);
                list.current?.scrollToOffset({ offset: 0, animated: false });
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
          {!!(error || invalid) && (
            <Text accessibilityRole="alert" style={[s.body, { color: c.pink }]}>
              {error || invalid}
            </Text>
          )}
          {!!(
            filters.category ||
            filters.city ||
            filters.from ||
            filters.to ||
            filters.minPrice ||
            filters.maxPrice ||
            filters.q
          ) && (
            <>
              <Text style={s.muted}>
                {category?.name ||
                  (filters.category ? "Danh mục đã chọn" : "Tất cả danh mục")}
                {filters.city ? ` · ${filters.city}` : ""}
              </Text>
              <HomeButton
                title="Xóa tất cả bộ lọc"
                secondary
                onPress={() => {
                  setFilters(emptyEventFilters);
                  setDraft(emptyEventFilters);
                  list.current?.scrollToOffset({ offset: 0, animated: false });
                  setError("");
                }}
              />
            </>
          )}
          <Text style={s.title}>Sự kiện dành cho bạn</Text>
          {events.data && (
            <Text style={s.muted}>{events.data.total} sự kiện</Text>
          )}
          <ResourceState
            loading={categories.loading}
            error={categories.error}
            onRetry={categories.reload}
          >
            {null}
          </ResourceState>
        </View>
      }
      ListEmptyComponent={
        invalid ? null : (
          <ResourceState
            loading={events.loading}
            error={events.error}
            onRetry={events.reload}
            empty={
              !events.data?.items.length
                ? "Chưa có sự kiện phù hợp. Hãy thử bộ lọc khác."
                : undefined
            }
          >
            {null}
          </ResourceState>
        )
      }
      ListFooterComponent={
        !invalid && !events.loading && events.items.length ? (
          <LoadMore
            more={events.more}
            loading={events.loadingMore}
            error={events.error}
            onLoadMore={events.loadMore}
            onRetry={events.retry}
          />
        ) : null
      }
    />
  );
}
