import { useState, type ReactNode } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../lib/session";
import { money, stateLabel, useResource, when } from "../lib/data";
import {
  Button,
  Field,
  Loading,
  Notice,
  Pager,
  RequireAuth,
  Screen,
  colors,
  ui,
} from "./ui";
import { HomeSheet } from "./home/primitives";
import Feather from "@expo/vector-icons/Feather";

export type Entity = Record<string, unknown>;
export const value = (row: Entity, key: string) =>
  row[key] == null ? "" : String(row[key]);
const managementStatus = (status: string) =>
  status === "ACTIVE"
    ? "Hoạt động"
    : status === "PENDING"
      ? "Chờ xử lý"
      : stateLabel(status);
export function useCanManage(scope: "organizer" | "admin") {
  const { user } = useSession();
  return !!user?.roles.some((role) =>
    (scope === "admin" ? ["ADMIN"] : ["ORGANIZER", "ADMIN"]).includes(role),
  );
}
export function ManagementGuard({
  scope,
  children,
}: {
  scope: "organizer" | "admin";
  children: ReactNode;
}) {
  const allowed = useCanManage(scope);
  return (
    <RequireAuth>
      {allowed ? (
        children
      ) : (
        <Screen>
          <Text style={ui.title}>Bạn chưa có quyền truy cập</Text>
          <Text style={ui.text}>
            Quyền quản lý được xác nhận theo tài khoản đang đăng nhập.
          </Text>
          <Button
            title="Về tài khoản"
            onPress={() => router.replace("/account")}
          />
        </Screen>
      )}
    </RequireAuth>
  );
}
export function WorkspaceLayout({ scope }: { scope: "organizer" | "admin" }) {
  const pathname = usePathname(),
    inset = useSafeAreaInsets();
  const links: { title: string; href: Href }[] =
    scope === "organizer"
      ? [
          { title: "Tổng quan", href: "/organizer" },
          { title: "Sự kiện", href: "/organizer/events" },
          { title: "Check-in", href: "/organizer/checkin" },
          { title: "Tài khoản", href: "/account" },
        ]
      : [
          { title: "Tổng quan", href: "/admin" },
          { title: "Phê duyệt", href: "/admin/reviews" },
          { title: "Quản lý", href: "/admin/manage" },
          { title: "Tài khoản", href: "/account" },
        ];
  return (
    <ManagementGuard scope={scope}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.ink,
            headerTitle: scope === "organizer" ? "Ban tổ chức" : "Quản trị",
            headerBackTitle: "Quay lại",
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingBottom: Math.max(inset.bottom, 12),
            backgroundColor: colors.surface,
          }}
        >
          {links.map((link, index) => {
            const selected =
              pathname === link.href ||
              (index === 1 &&
                scope === "organizer" &&
                pathname.startsWith("/organizer/events")) ||
              (index === 2 &&
                scope === "admin" &&
                pathname.startsWith("/admin/") &&
                !pathname.startsWith("/admin/reviews"));
            const icons =
              scope === "organizer"
                ? ["grid", "calendar", "maximize", "user"]
                : ["grid", "check-circle", "layers", "user"];
            return (
              <Pressable
                key={link.title}
                accessibilityRole="tab"
                accessibilityLabel={link.title}
                aria-selected={selected}
                accessibilityState={{ selected }}
                onPress={() => router.replace(link.href)}
                style={{
                  flex: 1,
                  minWidth: 76,
                  minHeight: 56,
                  padding: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Feather
                  name={icons[index] as keyof typeof Feather.glyphMap}
                  size={20}
                  color={selected ? colors.primary : colors.muted}
                />
                <Text
                  style={{
                    ...ui.muted,
                    color: selected ? colors.primary : colors.muted,
                    textAlign: "center",
                  }}
                >
                  {link.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ManagementGuard>
  );
}
type PageResult = {
  items?: Entity[];
  data?: Entity[];
  pagination?: { totalPages?: number };
  hasNext?: boolean;
};
export function EntityList({
  scope,
  title,
  endpoint,
  onOpen,
  summary,
  header,
  statuses = [],
  extra = "",
  searchKey = "q",
  searchable = true,
  statusKey = "status",
  titleFor,
  envelope = false,
  listSummary,
  rowAccessory,
  batchDetails,
  enabled = true,
}: {
  scope: "organizer" | "admin";
  title: string;
  endpoint: string;
  onOpen?: (row: Entity) => void;
  summary?: (row: Entity) => string;
  header?: ReactNode;
  statuses?: { value: string; label: string }[];
  extra?: string;
  searchKey?: string;
  searchable?: boolean;
  statusKey?: string;
  titleFor?: (row: Entity) => string;
  envelope?: boolean;
  listSummary?: (
    data: Entity,
    filters: { q: string; status: string },
  ) => ReactNode;
  rowAccessory?: (row: Entity) => ReactNode;
  enabled?: boolean;
  batchDetails?: {
    path: (rows: Entity[]) => string;
    render: (row: Entity, data: Entity[]) => ReactNode;
  };
}) {
  const allowed = useCanManage(scope),
    insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(""),
    [q, setQ] = useState(""),
    [pageState, setPageState] = useState({
      key: `${endpoint}:${extra}`,
      page: 0,
    }),
    [status, setStatus] = useState("");
  const [sheet, setSheet] = useState(false),
    [draftStatus, setDraftStatus] = useState("");
  const pageKey = `${endpoint}:${extra}`;
  const page = pageState.key === pageKey ? pageState.page : 0;
  if (pageState.key !== pageKey) setPageState({ key: pageKey, page: 0 });
  const setPage = (next: number | ((page: number) => number)) =>
    setPageState({
      key: pageKey,
      page: typeof next === "function" ? next(page) : next,
    });
  const search = new URLSearchParams({ page: String(page) });
  if (q && searchable) search.set(searchKey, q);
  if (status) search.set(statusKey, status);
  const resource = useResource<Entity[] | PageResult>(
    allowed && enabled ? `${endpoint}?${search}${extra}` : null,
    envelope,
  );
  const rows = Array.isArray(resource.data)
    ? resource.data
    : (resource.data?.items ?? resource.data?.data ?? []);
  const details = useResource<Entity[]>(
    allowed && batchDetails && rows.length ? batchDetails.path(rows) : null,
  );
  const more = Array.isArray(resource.data)
    ? Number(rows[0]?.total_results ?? 0) > (page + 1) * 50 ||
      rows.length === 50
    : (resource.data?.hasNext ??
      page + 1 < (resource.data?.pagination?.totalPages ?? 0));
  return (
    <ManagementGuard scope={scope}>
      <FlatList
        data={rows}
        keyExtractor={(row, index) =>
          value(row, "id") || value(row, "idUser") || String(index)
        }
        keyboardShouldPersistTaps="handled"
        refreshing={resource.loading}
        onRefresh={resource.reload}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 14,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
        }}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <Text style={ui.title}>{title}</Text>
            {header}
            {resource.data &&
              !Array.isArray(resource.data) &&
              listSummary?.(resource.data as Entity, { q, status })}
            <Notice error text={details.error} />
            {details.error && (
              <Button
                title="Tải lại số liệu chi tiết"
                secondary
                onPress={details.reload}
              />
            )}
            {searchable && (
              <>
                <Field
                  label="Tìm kiếm"
                  icon="search"
                  value={draft}
                  onChangeText={setDraft}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    setQ(draft.trim());
                    setPage(0);
                  }}
                />
                <Button
                  title="Tìm kiếm"
                  icon="search"
                  onPress={() => {
                    setQ(draft.trim());
                    setPage(0);
                  }}
                />
              </>
            )}
            {!!statuses.length && (
              <Button
                icon="filter"
                title={
                  status
                    ? `Lọc: ${statuses.find((s) => s.value === status)?.label ?? status}`
                    : "Lọc trạng thái"
                }
                secondary
                onPress={() => {
                  setDraftStatus(status);
                  setSheet(true);
                }}
              />
            )}
            <Notice error text={resource.error} />
            {resource.error && (
              <Button title="Thử tải lại" secondary onPress={resource.reload} />
            )}
          </View>
        }
        ListEmptyComponent={
          resource.loading ? (
            <Loading />
          ) : !resource.error ? (
            <Notice text="Chưa có dữ liệu phù hợp. Hãy thay đổi bộ lọc hoặc làm mới." />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={ui.card}>
            <Text style={ui.h2}>
              {titleFor?.(item) ||
                value(item, "title") ||
                value(item, "organization_name") ||
                value(item, "name") ||
                value(item, "order_code") ||
                value(item, "ticket_code") ||
                value(item, "id")}
            </Text>
            {!!value(item, "status") && (
              <Text style={ui.badge}>
                {managementStatus(value(item, "status"))}
              </Text>
            )}
            {summary && <Text style={ui.text}>{summary(item)}</Text>}
            {rowAccessory?.(item)}
            {details.data && batchDetails?.render(item, details.data)}
            {onOpen && (
              <Button
                title="Xem chi tiết"
                icon="arrow-right"
                secondary
                label={`Xem chi tiết ${value(item, "title") || value(item, "name") || value(item, "order_code") || value(item, "organization_name")}`}
                onPress={() => onOpen(item)}
              />
            )}
          </View>
        )}
        ListFooterComponent={
          <Pager
            page={page}
            setPage={setPage}
            more={more}
            loading={resource.loading}
            error={!!resource.error}
          />
        }
      />
      <HomeSheet
        title="Trạng thái"
        visible={sheet}
        onClose={() => setSheet(false)}
      >
        {[{ value: "", label: "Tất cả" }, ...statuses].map((option) => (
          <Button
            key={option.value}
            title={`${draftStatus === option.value ? "✓ " : ""}${option.label}`}
            secondary
            onPress={() => setDraftStatus(option.value)}
          />
        ))}
        <Button
          title="Áp dụng"
          onPress={() => {
            setStatus(draftStatus);
            setPage(0);
            setSheet(false);
          }}
        />
      </HomeSheet>
    </ManagementGuard>
  );
}

export function DetailFields({
  row,
  fields,
}: {
  row: Entity;
  fields: [string, string][];
}) {
  const dateKeys = new Set([
    "created_at",
    "createdAt",
    "starts_at",
    "ends_at",
    "checked_in_at",
    "checkedInAt",
    "transaction_at",
    "reviewed_at",
    "issuedAt",
    "succeededAt",
    "startsAt",
    "endsAt",
    "checkinOpensAt",
    "checkinClosesAt",
  ]);
  return (
    <View style={ui.card}>
      {fields.map(([key, label]) => (
        <View key={key} style={{ gap: 4 }}>
          <Text style={ui.muted}>{label}</Text>
          <Text selectable style={ui.text}>
            {key === "status"
              ? managementStatus(value(row, key))
              : typeof row[key] === "boolean"
                ? row[key]
                  ? "Có"
                  : "Không"
                : !value(row, key)
                  ? "Chưa có thông tin"
                  : dateKeys.has(key)
                    ? when(value(row, key))
                    : label.includes("(VND)")
                      ? money(value(row, key))
                      : value(row, key)}
          </Text>
        </View>
      ))}
    </View>
  );
}
