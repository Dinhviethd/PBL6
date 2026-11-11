import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useResource, type Category, type Event } from "../../lib/data";
import { emptyEventFilters, type EventFilters } from "../../lib/event-search";
import { homeColors as c, homeStyles as s } from "../../theme/home";
import {
  HomeButton,
  HomeSheet,
  ResourceState,
  SectionTitle,
} from "./primitives";
import {
  HomeHero,
  HomeCategoryGrid,
  HomeBenefits,
  HomeOrganizerCTA,
  HomeFooter,
} from "./sections";
import { HomeSearchPanel } from "./search-panel";
import { HomeEventCard } from "./event-card";
import { useSession } from "../../lib/session";

export default function HomeScreen() {
  const { user } = useSession();
  const headerHeight = useHeaderHeight();
  const { width, fontScale } = useWindowDimensions();
  const [filters, setFilters] = useState(emptyEventFilters);
  const [development, setDevelopment] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const categories = useResource<Category[]>("/categories");
  const events = useResource<{ items: Event[]; total: number }>(
    "/events?page=0",
  );
  const config = useResource<{ paymentMode: string }>("/config");
  const search = (values: EventFilters) =>
    router.push({ pathname: "/explore", params: { ...values } });
  const twoColumns = width >= 600 && fontScale <= 1.3;
  const showOrganizer = () =>
    router.push(
      user?.roles.some((role) => ["ORGANIZER", "ADMIN"].includes(role))
        ? "/organizer"
        : "/register-organizer",
    );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView
        testID="home-scroll"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing &&
              (events.loading || categories.loading || config.loading)
            }
            onRefresh={() => {
              setRefreshing(true);
              events.reload();
              categories.reload();
              config.reload();
            }}
            tintColor={c.cyan}
            colors={[c.purple]}
          />
        }
        contentContainerStyle={{
          width: "100%",
          maxWidth: 880,
          alignSelf: "center",
          paddingHorizontal: width < 360 ? 12 : 16,
          paddingTop: 12,
          paddingBottom: 30,
          gap: 32,
        }}
      >
        <View style={{ gap: 18 }}>
          <HomeHero onOrganizer={showOrganizer} />
          <HomeSearchPanel
            filters={filters}
            onChange={setFilters}
            onSearch={search}
            categories={categories.data ?? []}
          />
          {config.data?.paymentMode === "demo" && (
            <Text accessibilityRole="alert" style={[s.body, s.card]}>
              Bản trải nghiệm · Thanh toán demo, không thu tiền thật.
            </Text>
          )}
        </View>
        <View style={s.section}>
          <SectionTitle
            eyebrow="PHÂN LOẠI ĐA CHIỀU"
            icon="grid"
            title="Danh mục sự kiện nổi bật"
          >
            <Text style={s.muted}>
              Chọn chủ đề bạn yêu thích và tìm cuộc hẹn tiếp theo.
            </Text>
          </SectionTitle>
          <ResourceState
            loading={categories.loading}
            error={categories.error}
            empty={
              !categories.data?.length ? "Chưa có danh mục sự kiện." : undefined
            }
            onRetry={categories.reload}
          >
            <HomeCategoryGrid
              categories={categories.data ?? []}
              onSelect={(category) => search({ ...filters, category })}
            />
          </ResourceState>
        </View>
        <View style={s.section}>
          <SectionTitle
            icon="calendar"
            eyebrow="SỰ KIỆN ĐANG MỞ BÁN"
            title="Sự kiện nổi bật"
          >
            {events.data && (
              <Text style={s.muted}>{events.data.total} sự kiện</Text>
            )}
          </SectionTitle>
          <ResourceState
            loading={events.loading}
            error={events.error}
            empty={
              !events.data?.items.length
                ? "Chưa có sự kiện phù hợp. Hãy thử điều chỉnh bộ lọc."
                : undefined
            }
            onRetry={events.reload}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              {events.data?.items.slice(0, 6).map((event) => (
                <View
                  key={event.id}
                  style={{ width: twoColumns ? "48%" : "100%", flexGrow: 1 }}
                >
                  <HomeEventCard event={event} />
                </View>
              ))}
            </View>
          </ResourceState>
          <HomeButton
            title="Xem tất cả sự kiện"
            icon="arrow-right"
            secondary
            onPress={() => search(filters)}
          />
        </View>
        <HomeBenefits />
        <HomeOrganizerCTA onPress={showOrganizer} />
        <HomeFooter onDevelopment={setDevelopment} />
      </ScrollView>
      <HomeSheet
        visible={!!development}
        title={development}
        onClose={() => setDevelopment("")}
      >
        <Text accessibilityRole="alert" style={s.body}>
          Chức năng đang phát triển
        </Text>
        <HomeButton title="Đã hiểu" onPress={() => setDevelopment("")} />
      </HomeSheet>
    </KeyboardAvoidingView>
  );
}
