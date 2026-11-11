import { useState } from "react";
import { MyWaitQueue } from "../../components/wait-queue";
import { Text, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { money, stateLabel, useResource, when } from "../../lib/data";
import type { HistoryData } from "../../lib/order-history-types";
import {
  orderGroups,
  rangeParams,
  type DateRange,
} from "../../lib/report-filters";
import {
  ChoiceFilter,
  MetricGrid,
  RangeFilter,
} from "../../components/report-controls";
import { useSession } from "../../lib/session";
import { InfoLine } from "../../components/mobile-patterns";
import {
  Button,
  Loading,
  Notice,
  Pager,
  RequireAuth,
  Field,
  colors,
  ui,
} from "../../components/ui";
export default function OrdersScreen() {
  const { user } = useSession(),
    insets = useSafeAreaInsets();
  const [page, setPage] = useState(0),
    [q, setQ] = useState(""),
    [draft, setDraft] = useState(""),
    [group, setGroup] = useState("all");
  const [range, setRange] = useState<DateRange>({ fromDate: "", toDate: "" });
  const query = rangeParams(range, true);
  query.set("page", String(page));
  query.set("pageSize", "10");
  query.set("q", q);
  query.set("group", group);
  const r = useResource<HistoryData>(
    user ? `/me/order-history?${query}` : null,
  );
  return (
    <RequireAuth>
      <FlatList
        data={r.data?.items ?? []}
        keyExtractor={(o) => o.id}
        keyboardShouldPersistTaps="handled"
        refreshing={r.loading}
        onRefresh={r.reload}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={ui.title}>Lịch sử đặt vé.</Text>
            <MyWaitQueue />
            {r.data && (
              <MetricGrid
                items={[
                  {
                    label: "Tổng đã thanh toán",
                    value: money(r.data.summary.totalAmount),
                  },
                  { label: "Đang xử lý", value: r.data.summary.processing },
                ]}
              />
            )}
            <Field
              label="Tìm đơn hàng"
              icon="search"
              placeholder="Mã đơn hoặc tên sự kiện"
              value={draft}
              onChangeText={setDraft}
              returnKeyType="search"
              maxLength={200}
              onSubmitEditing={() => {
                setQ(draft.trim());
                setPage(0);
              }}
            />
            <Button
              title="Tìm kiếm đơn hàng"
              icon="search"
              onPress={() => {
                setQ(draft.trim());
                setPage(0);
              }}
            />
            <ChoiceFilter
              label="Nhóm đơn hàng"
              value={group}
              options={orderGroups.map((o) => ({
                ...o,
                label: `${o.label}${r.data ? ` (${r.data.counts[o.value as keyof HistoryData["counts"]]})` : ""}`,
              }))}
              onChange={(v) => {
                setGroup(v);
                setPage(0);
              }}
            />
            <RangeFilter
              range={range}
              optional
              onChange={(v) => {
                setRange(v);
                setPage(0);
              }}
            />
            <Notice error text={r.error} />
            {r.error && (
              <Button title="Thử tải lại" secondary onPress={r.reload} />
            )}
            {r.data && (
              <Text style={ui.muted}>
                {r.data.pagination.total} đơn phù hợp
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          r.loading ? (
            <Loading />
          ) : !r.error ? (
            <Notice text="Chưa có đơn hàng phù hợp. Hãy thử thay đổi bộ lọc." />
          ) : null
        }
        renderItem={({ item: o }) => (
          <View style={ui.card} key={o.id}>
            <Text style={ui.badge}>
              {o.payment.unresolvedReview
                ? "Cần tra soát thanh toán"
                : stateLabel(o.status)}
            </Text>
            <Text style={ui.h2}>{o.event_title_snapshot}</Text>
            <InfoLine
              icon="calendar"
              text={`${o.order_code} · ${when(o.created_at)}`}
            />
            <Text style={[ui.text, { fontVariant: ["tabular-nums"] }]}>
              {o.items.reduce((n, i) => n + i.quantity, 0)} vé ·{" "}
              {money(o.total_amount)}
            </Text>
            <Text style={ui.muted}>
              Đã phát hành {o.tickets.issued}/{o.tickets.expected} vé · Đã dùng{" "}
              {o.tickets.checkedIn}
            </Text>
            <Button
              title="Xem đơn hàng"
              label={`Xem đơn ${o.order_code}`}
              icon="file-text"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/orders/[id]",
                  params: { id: o.id },
                })
              }
            />
            {o.actions.canViewTickets && (
              <Button
                title="Mở ví vé"
                icon="tag"
                secondary
                onPress={() => router.push("/tickets")}
              />
            )}
          </View>
        )}
        ListFooterComponent={
          r.data ? (
            <Pager
              page={page}
              setPage={setPage}
              more={page + 1 < r.data.pagination.totalPages}
              loading={r.loading}
              error={!!r.error}
            />
          ) : null
        }
      />
    </RequireAuth>
  );
}
