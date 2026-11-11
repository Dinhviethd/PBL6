import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { stateLabel, type Ticket } from "../../lib/data";
import { usePagedResource } from "../../lib/paged-resource";
import { LoadMore } from "../../components/load-more";
import { useSession } from "../../lib/session";
import { AppIcon, IconBadge } from "../../components/app-icon";
import { EmptyState, InfoLine } from "../../components/mobile-patterns";
import { Button, Loading, RequireAuth, ui, colors } from "../../components/ui";
const ticketPages = {
  items: (data: Ticket[]) => data,
  more: (data: Ticket[]) => data.length === 50,
  key: (ticket: Ticket) => ticket.id,
};
export default function TicketsScreen() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const r = usePagedResource(user ? "/me/tickets" : null, ticketPages);
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
        keyExtractor={(ticket) => ticket.id}
        refreshing={r.loading}
        onRefresh={r.reload}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <Text style={ui.eyebrow}>NHỮNG CUỘC HẸN SẮP TỚI</Text>
            <Text style={ui.title}>Ví vé của bạn.</Text>
          </View>
        }
        ListEmptyComponent={
          r.loading ? (
            <Loading />
          ) : !r.error ? (
            <EmptyState
              icon="tag"
              title="Ví vé đang trống"
              description="Vé sẽ xuất hiện ở đây sau khi thanh toán thành công."
            />
          ) : null
        }
        renderItem={({ item: t }) => (
          <View style={ui.card} key={t.id}>
            <View style={[ui.row, { justifyContent: "space-between" }]}>
              <IconBadge name="tag" />
              <Text style={ui.badge}>{stateLabel(t.status)}</Text>
            </View>
            <Text style={ui.h2}>{t.event_title_snapshot}</Text>
            <InfoLine icon="layers" text={t.ticket_type_name_snapshot} />
            <View
              style={{
                borderTopWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.border,
                paddingTop: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AppIcon name="maximize" />
                <Text
                  selectable
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  accessibilityLabel={t.ticket_code}
                  style={[
                    ui.text,
                    { flex: 1, minWidth: 0, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {t.ticket_code}
                </Text>
              </View>
            </View>
            <Button
              title="Mở vé"
              label={`Mở vé ${t.ticket_code}`}
              icon="maximize"
              onPress={() =>
                router.push({
                  pathname: "/tickets/[id]",
                  params: { id: t.id },
                })
              }
            />
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
