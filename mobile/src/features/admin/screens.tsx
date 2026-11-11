import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";
import { errorMessage, money, useResource, when } from "../../lib/data";
import {
  Button,
  Field,
  Loading,
  Notice,
  Screen,
  ui,
} from "../../components/ui";
import {
  DetailFields,
  EntityList,
  useCanManage,
  value,
  type Entity,
} from "../../components/management";
import { HomeSheet } from "../../components/home/primitives";
import {
  ChoiceFilter,
  MetricGrid,
  RangeFilter,
  RevenueChart,
  type DailyPoint,
} from "../../components/report-controls";
import {
  dayBoundary,
  rangeParams,
  recentRange,
  type DateRange,
} from "../../lib/report-filters";
import { exportCsv } from "../../lib/document-export";
import { SepayReconcile } from "../../components/sepay-reconcile";

export function AdminHome() {
  const [range, setRange] = useState(() => recentRange());
  const allowed = useCanManage("admin"),
    r = useResource<Entity>(allowed ? "/admin/stats" : null);
  const revenue = useResource<{ totalRevenue: string; series: DailyPoint[] }>(
    allowed ? `/admin/stats/revenue-daily?${rangeParams(range)}` : null,
  );
  return (
    <Screen
      refresh={() => {
        r.reload();
        revenue.reload();
      }}
      loading={r.loading || revenue.loading}
    >
      <Text style={ui.title}>Tổng quan quản trị</Text>
      <Notice error text={r.error} />
      <RangeFilter range={range} onChange={setRange} />
      <Notice error text={revenue.error} />
      {revenue.error && (
        <Button title="Tải lại doanh thu" secondary onPress={revenue.reload} />
      )}
      {revenue.loading && !revenue.data ? (
        <Loading />
      ) : (
        revenue.data && (
          <>
            <MetricGrid
              items={[
                {
                  label: "Doanh thu trong kỳ",
                  value: money(revenue.data.totalRevenue),
                },
              ]}
            />
            <RevenueChart series={revenue.data.series} />
          </>
        )
      )}
      <Text style={ui.h2}>Tổng quan toàn hệ thống</Text>
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <DetailFields
            row={r.data}
            fields={[
              ["revenue", "Doanh thu (VND)"],
              ["orders", "Đơn hàng"],
              ["sold", "Vé đã bán"],
              ["checkins", "Lượt check-in"],
              ["needs_review", "Giao dịch cần đối soát"],
              ["events", "Sự kiện"],
              ["users", "Tài khoản"],
              ["organizers", "Ban tổ chức"],
            ]}
          />
        )
      )}
      <Button
        title="Hàng đợi duyệt sự kiện"
        onPress={() => router.push("/admin/reviews")}
      />
      <Button
        title="Hồ sơ Ban tổ chức chờ duyệt"
        secondary
        onPress={() => router.push("/admin/applications")}
      />
      <Button
        title="Quản lý hệ thống"
        secondary
        onPress={() => router.push("/admin/manage")}
      />
    </Screen>
  );
}
export function AdminManage() {
  return (
    <Screen>
      <Text style={ui.title}>Quản lý hệ thống</Text>
      {[
        ["users", "Khách hàng"],
        ["organizers", "Ban tổ chức"],
        ["categories", "Danh mục sự kiện"],
        ["events", "Toàn bộ sự kiện"],
        ["payments", "Giao dịch"],
        ["settings", "Cấu hình và quản trị viên"],
        ["legal-requests", "Thay đổi pháp nhân BTC"],
      ].map(([key, title]) => (
        <Button
          key={key}
          title={title}
          secondary
          onPress={() => router.push(`/admin/${key}`)}
        />
      ))}
    </Screen>
  );
}
export function AdminUsers() {
  const [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  async function lockSelected() {
    if (busy || !selected.length || !reason.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.request<{ updated: number; skipped: number }>(
        "/admin/users/bulk-status",
        "PATCH",
        {
          ids: selected,
          status: "INACTIVE",
          locked: true,
          reason: reason.trim(),
        },
      );
      setNotice(
        `Đã khóa ${result.updated} tài khoản; bỏ qua ${result.skipped}.`,
      );
      setSelected([]);
      setConfirm(false);
      setReason("");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <EntityList
      scope="admin"
      title="Khách hàng"
      key={revision}
      endpoint="/admin/users"
      listSummary={(data, filters) => (
        <View style={{ gap: 12 }}>
          <Notice error text={error} />
          <Notice text={notice} />
          <Text style={ui.muted}>
            {String((data.pagination as Entity).total)} khách hàng phù hợp · Đã
            chọn {selected.length}/50
          </Text>
          <Button
            title={busy ? "Đang xuất…" : "Xuất khách hàng CSV"}
            secondary
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError("");
              const generation = api.sessionVersion();
              const query = new URLSearchParams({
                q: filters.q,
                ...(filters.status ? { status: filters.status } : {}),
              });
              api
                .request<string>(
                  `/admin/users/export?${query}`,
                  "GET",
                  undefined,
                  {},
                  "text",
                )
                .then((text) =>
                  exportCsv(
                    text,
                    "eventhub-customers",
                    () => generation === api.sessionVersion(),
                  ),
                )
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          />
          {!!selected.length && (
            <>
              <Button
                title={`Khóa ${selected.length} tài khoản đã chọn`}
                secondary
                disabled={busy}
                onPress={() => {
                  setConfirm(true);
                  setReason("");
                  setError("");
                }}
              />
              <Button
                title="Bỏ chọn tất cả"
                secondary
                disabled={busy}
                onPress={() => setSelected([])}
              />
            </>
          )}
          <HomeSheet
            title="Xác nhận khóa tài khoản"
            visible={confirm}
            onClose={() => {
              if (!busy) setConfirm(false);
            }}
          >
            <Text style={ui.text}>
              Khóa {selected.length} khách hàng đã chọn. Các phiên đăng nhập của
              họ sẽ bị thu hồi.
            </Text>
            <Field
              label="Lý do khóa các tài khoản"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={2000}
              editable={!busy}
            />
            <Notice error text={error} />
            <Button
              title="Xác nhận khóa đã chọn"
              disabled={busy || !reason.trim()}
              onPress={() => void lockSelected()}
            />
          </HomeSheet>
        </View>
      )}
      rowAccessory={(row) => {
        const id = value(row, "idUser"),
          checked = selected.includes(id);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Chọn khách hàng ${value(row, "name") || value(row, "email")}`}
            aria-checked={checked}
            accessibilityState={{
              checked,
              disabled: busy || (!checked && selected.length >= 50),
            }}
            disabled={busy || (!checked && selected.length >= 50)}
            onPress={() =>
              setSelected((ids) =>
                checked ? ids.filter((v) => v !== id) : [...ids, id],
              )
            }
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={ui.text}>
              {checked ? "☑ Đã chọn" : "☐ Chọn tài khoản"}
            </Text>
          </Pressable>
        );
      }}
      statuses={[
        { value: "ACTIVE", label: "Hoạt động" },
        { value: "INACTIVE", label: "Vô hiệu hóa" },
        { value: "LOCKED", label: "Bị khóa" },
      ]}
      summary={(row) =>
        `${value(row, "email")}\nĐơn hàng: ${value(row, "orderCount")} · Chi tiêu: ${money(value(row, "totalSpend"))}`
      }
      onOpen={(row) => router.push(`/admin/users/${value(row, "idUser")}`)}
    />
  );
}
export function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin"),
    r = useResource<Entity>(allowed ? `/admin/users/${id}` : null);
  const [confirm, setConfirm] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const unlock = r.data?.locked_at || r.data?.status === "INACTIVE";
      await api.request(`/admin/users/${id}`, "PATCH", {
        status: unlock ? "ACTIVE" : "INACTIVE",
        locked: !unlock,
        reason: reason.trim(),
      });
      setConfirm(false);
      setReason("");
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Chi tiết khách hàng</Text>
      <Notice error text={r.error || error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <DetailFields
              row={r.data}
              fields={[
                ["name", "Họ tên"],
                ["email", "Email"],
                ["phone", "Điện thoại"],
                ["status", "Trạng thái"],
                ["lock_reason", "Lý do khóa"],
                ["createdAt", "Ngày tạo"],
                ["orderCount", "Đơn hàng"],
                ["totalSpend", "Chi tiêu (VND)"],
              ]}
            />
            <Button
              title={
                r.data.locked_at || r.data.status === "INACTIVE"
                  ? "Mở khóa tài khoản"
                  : "Khóa tài khoản"
              }
              secondary
              onPress={() => setConfirm(true)}
            />
            {confirm && (
              <View style={ui.card}>
                <Text style={ui.text}>
                  Xác nhận thay đổi trạng thái tài khoản? Các phiên có thể bị
                  thu hồi.
                </Text>
                <Field
                  label="Lý do thay đổi trạng thái"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={2000}
                />
                <Button
                  title="Xác nhận thay đổi trạng thái"
                  disabled={busy || !reason.trim()}
                  onPress={() => void save()}
                />
                <Button
                  title="Quay lại"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirm(false)}
                />
              </View>
            )}
          </>
        )
      )}
    </Screen>
  );
}
export function AdminOrganizers() {
  return (
    <EntityList
      scope="admin"
      title="Ban tổ chức"
      endpoint="/admin/organizer-applications"
      statuses={[
        { value: "PENDING", label: "Chờ duyệt" },
        { value: "APPROVED", label: "Đã duyệt" },
        { value: "REJECTED", label: "Từ chối" },
      ]}
      summary={(row) =>
        `${value(row, "contact_email")} · ${value(row, "contact_phone")}\nDoanh thu: ${money(value(row, "gmv"))}`
      }
      onOpen={(row) => router.push(`/admin/organizers/${value(row, "id")}`)}
    />
  );
}
export function AdminApplications() {
  return (
    <EntityList
      scope="admin"
      title="Hồ sơ Ban tổ chức"
      endpoint="/admin/organizer-applications"
      extra="&status=PENDING_OR_REJECTED"
      summary={(row) =>
        `${value(row, "contact_name")} · ${value(row, "contact_email")}`
      }
      onOpen={(row) => router.push(`/admin/applications/${value(row, "id")}`)}
    />
  );
}

function Decision({
  endpoint,
  reload,
}: {
  endpoint: string;
  reload: () => void;
}) {
  const [choice, setChoice] = useState<"approve" | "reject" | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (busy || !choice) return;
    setBusy(true);
    setError("");
    try {
      await api.request(endpoint, "POST", {
        approve: choice === "approve",
        reason: reason.trim(),
      });
      setChoice(null);
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      <Notice error text={error} />
      {choice ? (
        <>
          <Text style={ui.h2}>
            Xác nhận {choice === "approve" ? "phê duyệt" : "từ chối"}?
          </Text>
          <Field
            label={choice === "reject" ? "Lý do từ chối" : "Ghi chú xét duyệt"}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={2000}
            editable={!busy}
          />
          <Button
            title="Xác nhận quyết định"
            disabled={busy || (choice === "reject" && !reason.trim())}
            onPress={() => void submit()}
          />
          <Button
            title="Quay lại"
            secondary
            disabled={busy}
            onPress={() => setChoice(null)}
          />
        </>
      ) : (
        <>
          <Button
            title="Phê duyệt"
            onPress={() => {
              setChoice("approve");
              setReason("");
            }}
          />
          <Button
            title="Từ chối"
            secondary
            onPress={() => {
              setChoice("reject");
              setReason("");
            }}
          />
        </>
      )}
      <Button
        title="Tải lại trạng thái mới nhất"
        secondary
        disabled={busy}
        onPress={reload}
      />
    </View>
  );
}
export function AdminApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin"),
    r = useResource<Entity>(
      allowed ? `/admin/organizer-applications/${id}` : null,
    );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Hồ sơ Ban tổ chức</Text>
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <DetailFields
              row={r.data}
              fields={[
                ["organization_name", "Tên tổ chức"],
                ["business_name", "Pháp nhân"],
                ["tax_id_or_business_license", "Mã số thuế / Giấy phép"],
                ["contact_name", "Người liên hệ"],
                ["contact_email", "Email"],
                ["contact_phone", "Điện thoại"],
                ["head_office_address", "Trụ sở"],
                ["description", "Giới thiệu"],
                ["website_or_social", "Website / Mạng xã hội"],
                ["main_event_category", "Loại sự kiện"],
                ["expected_event_scale", "Quy mô"],
                ["status", "Trạng thái"],
                ["rejection_reason", "Phản hồi"],
              ]}
            />
            {r.data.status === "PENDING" && (
              <Decision
                endpoint={`/admin/organizer-applications/${id}/review`}
                reload={r.reload}
              />
            )}
          </>
        )
      )}
    </Screen>
  );
}
export function AdminOrganizerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin");
  const profile = useResource<Entity>(
    allowed ? `/admin/organizer-applications/${id}` : null,
  );
  return (
    <EntityList
      scope="admin"
      title="Chi tiết Ban tổ chức"
      searchable={false}
      endpoint="/admin/events"
      enabled={!!profile.data?.user_id}
      extra={
        profile.data?.user_id
          ? `&organizerId=${encodeURIComponent(value(profile.data, "user_id"))}`
          : ""
      }
      header={
        <View style={{ gap: 14 }}>
          <Notice error text={profile.error} />
          {profile.loading ? (
            <Loading />
          ) : (
            profile.data && (
              <>
                <DetailFields
                  row={profile.data}
                  fields={[
                    ["organization_name", "Ban tổ chức"],
                    ["status", "Trạng thái hồ sơ"],
                    ["business_name", "Pháp nhân"],
                    ["tax_id_or_business_license", "Mã số thuế / Giấy phép"],
                    ["contact_name", "Liên hệ"],
                    ["contact_email", "Email"],
                    ["contact_phone", "Điện thoại"],
                    ["head_office_address", "Trụ sở"],
                    ["description", "Giới thiệu"],
                    ["website_or_social", "Website / Mạng xã hội"],
                    ["reviewed_at", "Ngày xét duyệt"],
                    ["rejection_reason", "Phản hồi xét duyệt"],
                  ]}
                />
                <Button
                  title="Xem hồ sơ xét duyệt"
                  secondary
                  onPress={() => router.push(`/admin/applications/${id}`)}
                />
                <Text style={ui.h2}>Sự kiện của Ban tổ chức</Text>
              </>
            )
          )}
        </View>
      }
      listSummary={(data) => (
        <Text style={ui.muted}>
          {String((data.pagination as Entity).total)} sự kiện
        </Text>
      )}
      summary={(row) =>
        `${when(value(row, "starts_at"))} · ${value(row, "venue_name")}`
      }
      onOpen={(row) => router.push(`/admin/events/${value(row, "id")}`)}
    />
  );
}
export function AdminEvents() {
  const [showFilters, setShowFilters] = useState(false);
  const allowed = useCanManage("admin"),
    options = useResource<{
      categories: Entity[];
      cities: string[];
      ticketScales: { value: string; label: string }[];
    }>(allowed ? "/admin/events/filter-options" : null);
  const [category, setCategory] = useState(""),
    [city, setCity] = useState(""),
    [scale, setScale] = useState("");
  const [range, setRange] = useState<DateRange>({ fromDate: "", toDate: "" });
  const query = new URLSearchParams();
  if (category) query.set("categoryId", category);
  if (city) query.set("cityCode", city);
  if (scale) query.set("ticketScale", scale);
  if (range.fromDate) query.set("startsFrom", dayBoundary(range.fromDate));
  if (range.toDate)
    query.set(
      "startsTo",
      new Date(Date.parse(dayBoundary(range.toDate, true)) - 1).toISOString(),
    );
  return (
    <EntityList
      scope="admin"
      title="Toàn bộ sự kiện"
      endpoint="/admin/events"
      extra={`&${query}`}
      header={
        <View style={{ gap: 12 }}>
          <Notice error text={options.error} />
          <Button
            title={
              showFilters
                ? "Thu gọn bộ lọc nâng cao"
                : `Bộ lọc nâng cao${query.size ? ` (${query.size})` : ""}`
            }
            secondary
            onPress={() => setShowFilters((v) => !v)}
          />
          {showFilters && (
            <View style={{ gap: 12 }}>
              <ChoiceFilter
                label="Danh mục"
                value={category}
                onChange={setCategory}
                options={[
                  { value: "", label: "Tất cả" },
                  ...(options.data?.categories ?? []).map((c) => ({
                    value: value(c, "id"),
                    label: value(c, "name"),
                  })),
                ]}
              />
              <ChoiceFilter
                label="Tỉnh / thành phố"
                value={city}
                onChange={setCity}
                options={[
                  { value: "", label: "Toàn quốc" },
                  ...(options.data?.cities ?? []).map((c) => ({
                    value: c,
                    label: c,
                  })),
                ]}
              />
              <ChoiceFilter
                label="Quy mô vé"
                value={scale}
                onChange={setScale}
                options={[
                  { value: "", label: "Tất cả" },
                  ...(options.data?.ticketScales ?? []),
                ]}
              />
              <Text style={ui.muted}>Lọc ngày bắt đầu sự kiện</Text>
              <RangeFilter range={range} optional onChange={setRange} />
            </View>
          )}
        </View>
      }
      listSummary={(data) => (
        <Text style={ui.muted}>
          {String((data.pagination as Entity).total)} sự kiện phù hợp
        </Text>
      )}
      batchDetails={{
        path: (rows) =>
          `/admin/events/metrics?eventIds=${rows.map((r) => encodeURIComponent(value(r, "id"))).join(",")}`,
        render: (row, metrics) => {
          const metric = metrics.find((m) => m.eventId === row.id);
          return metric ? (
            <Text style={ui.muted}>
              Đã bán {value(metric, "ticketsSold")}/
              {value(metric, "ticketCapacity")} vé · Doanh thu{" "}
              {money(value(metric, "revenue"))} · Check-in{" "}
              {value(metric, "checkins")}
            </Text>
          ) : null;
        },
      }}
      statuses={[
        { value: "PUBLISHED", label: "Đã xuất bản" },
        { value: "PENDING_REVIEW", label: "Chờ duyệt" },
        { value: "DRAFT", label: "Nháp" },
        { value: "CANCELLED", label: "Đã hủy" },
        { value: "REJECTED", label: "Bị từ chối" },
      ]}
      summary={(row) =>
        `${value(row, "venue_name")} · ${value(row, "city_code")}\n${when(value(row, "starts_at"))}`
      }
      onOpen={(row) => router.push(`/admin/events/${value(row, "id")}`)}
    />
  );
}
export function AdminReviews() {
  return (
    <EntityList
      scope="admin"
      title="Hàng đợi duyệt sự kiện"
      endpoint="/admin/events"
      extra="&status=PENDING_REVIEW"
      header={
        <Button
          title="Hồ sơ Ban tổ chức"
          secondary
          onPress={() => router.push("/admin/applications")}
        />
      }
      summary={(row) =>
        `${value(row, "venue_name")} · ${value(row, "starts_at")}`
      }
      onOpen={(row) => router.push(`/admin/events/${value(row, "id")}`)}
    />
  );
}
export function AdminEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin"),
    r = useResource<Entity>(allowed ? `/organizer/events/${id}` : null);
  const organizer = useResource<Entity[]>(
    allowed && r.data?.organizer_id
      ? `/admin/organizers/summaries?ids=${encodeURIComponent(value(r.data, "organizer_id"))}`
      : null,
  );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Chi tiết sự kiện</Text>
      <Notice error text={r.error} />
      <Notice error text={organizer.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <DetailFields
              row={{
                ...r.data,
                organizer_name:
                  value(organizer.data?.[0] ?? {}, "organization_name") ||
                  "Đang tải thông tin tổ chức",
              }}
              fields={[
                ["title", "Sự kiện"],
                ["status", "Trạng thái"],
                ["organizer_name", "Ban tổ chức"],
                ["venue_name", "Địa điểm"],
                ["address", "Địa chỉ"],
                ["starts_at", "Bắt đầu"],
                ["ends_at", "Kết thúc"],
                ["description", "Nội dung"],
              ]}
            />
            {((r.data.ticketTypes as Entity[]) ?? []).map((t) => (
              <DetailFields
                key={value(t, "id")}
                row={t}
                fields={[
                  ["name", "Loại vé"],
                  ["price_amount", "Giá vé (VND)"],
                  ["capacity", "Số lượng"],
                ]}
              />
            ))}
            {r.data.status === "PENDING_REVIEW" && (
              <Decision
                endpoint={`/admin/events/${id}/review`}
                reload={r.reload}
              />
            )}
          </>
        )
      )}
    </Screen>
  );
}

export function AdminCategories() {
  const [version, setVersion] = useState(0),
    [editing, setEditing] = useState<Entity | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function open(row: Entity = {}) {
    setEditing(row);
    setName(value(row, "name"));
    setDescription(value(row, "description"));
    setRemove(false);
    setError("");
  }
  async function save(deleting = false) {
    if (busy || !editing) return;
    setBusy(true);
    setError("");
    try {
      const id = value(editing, "id");
      await api.request(
        `/admin/categories${id ? `/${id}` : ""}`,
        deleting ? "DELETE" : id ? "PATCH" : "POST",
        deleting
          ? undefined
          : { name: name.trim(), description: description.trim() },
      );
      setEditing(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <EntityList
        key={version}
        scope="admin"
        title="Danh mục sự kiện"
        endpoint="/admin/categories"
        header={<Button title="Thêm danh mục" onPress={() => open()} />}
        summary={(row) =>
          `${value(row, "event_count")} sự kiện · ${row.archived_at ? "Đã ẩn" : "Đang hoạt động"}`
        }
        onOpen={open}
      />
      <HomeSheet
        visible={!!editing}
        title={editing?.id ? "Chỉnh sửa danh mục" : "Tạo danh mục"}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
      >
        <Notice error text={error} />
        <Field
          label="Tên danh mục"
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={!busy}
        />
        <Field
          label="Mô tả danh mục"
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
          editable={!busy}
        />
        <Button
          title="Lưu danh mục"
          disabled={busy || !name.trim()}
          onPress={() => void save()}
        />
        {!!editing?.id && !editing.archived_at && (
          <Button
            title="Ẩn danh mục"
            secondary
            disabled={busy}
            onPress={() => setRemove(true)}
          />
        )}
        {remove && (
          <View style={ui.card}>
            <Text style={ui.text}>
              Xác nhận ẩn danh mục? Dữ liệu sự kiện được giữ lại.
            </Text>
            <Button
              title="Xác nhận ẩn danh mục"
              disabled={busy}
              onPress={() => void save(true)}
            />
            <Button
              title="Giữ danh mục"
              secondary
              disabled={busy}
              onPress={() => setRemove(false)}
            />
          </View>
        )}
      </HomeSheet>
    </>
  );
}
export function AdminPayments() {
  const [version, setVersion] = useState(0),
    [range, setRange] = useState<DateRange>({ fromDate: "", toDate: "" });
  const extra = new URLSearchParams();
  if (range.fromDate) extra.set("from", dayBoundary(range.fromDate));
  if (range.toDate)
    extra.set(
      "to",
      new Date(Date.parse(dayBoundary(range.toDate, true)) - 1).toISOString(),
    );
  const [kind, setKind] = useState<"payments" | "sepay/transactions">(
    "payments",
  );
  return (
    <EntityList
      key={`${kind}:${version}`}
      scope="admin"
      title="Giao dịch"
      endpoint={`/admin/${kind}`}
      extra={`&${extra}`}
      searchKey={kind === "payments" ? "q" : "reference"}
      statuses={
        kind === "payments"
          ? [
              { value: "PENDING", label: "Chờ xử lý" },
              { value: "SUCCEEDED", label: "Thành công" },
              { value: "FAILED", label: "Thất bại" },
            ]
          : [
              { value: "RECEIVED", label: "Đã nhận" },
              { value: "PROCESSING", label: "Đang xử lý" },
              { value: "PROCESSED", label: "Đã xử lý" },
              { value: "REVIEW", label: "Cần đối soát" },
              { value: "ERROR", label: "Lỗi" },
            ]
      }
      header={
        <View style={{ gap: 12 }}>
          <Button
            title="Thanh toán đơn hàng"
            secondary
            onPress={() => setKind("payments")}
          />
          <Button
            title="Giao dịch SePay"
            secondary
            onPress={() => setKind("sepay/transactions")}
          />
          <RangeFilter range={range} optional onChange={setRange} />
          {kind === "sepay/transactions" && (
            <SepayReconcile onComplete={() => setVersion((v) => v + 1)} />
          )}
        </View>
      }
      summary={(row) =>
        `${money(value(row, "amount"))} · ${value(row, "provider") || value(row, "bank_code")}\n${value(row, "order_id") || value(row, "payment_code")}\n${value(row, "review_reason") || value(row, "reason")}`
      }
      onOpen={
        kind === "sepay/transactions"
          ? (row) => router.push(`/admin/transactions/${value(row, "id")}`)
          : undefined
      }
    />
  );
}
export function AdminSettings() {
  const allowed = useCanManage("admin"),
    r = useResource<{ sepay: Entity; vnpay: Entity }>(
      allowed ? "/admin/settings/payment-information" : null,
    );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Cấu hình thanh toán</Text>
      <Text style={ui.muted}>Thông tin vận hành do máy chủ cung cấp.</Text>
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <Text style={ui.h2}>MB Bank / SePay</Text>
            <DetailFields
              row={r.data.sepay}
              fields={[
                ["environment", "Môi trường"],
                ["configured", "Đã cấu hình"],
                ["enabled", "Đang bật"],
                ["bankCode", "Ngân hàng"],
                ["accountNumber", "Số tài khoản"],
                ["accountName", "Tên tài khoản"],
                ["transferContent", "Nội dung chuyển khoản"],
              ]}
            />
            <Text style={ui.h2}>VNPay</Text>
            <DetailFields
              row={r.data.vnpay}
              fields={[
                ["environment", "Môi trường"],
                ["configured", "Đã cấu hình"],
                ["enabled", "Đang bật"],
                ["merchantCode", "Mã đơn vị"],
              ]}
            />
          </>
        )
      )}
      <Button
        title="Quản lý quản trị viên"
        secondary
        onPress={() => router.push("/admin/administrators")}
      />
    </Screen>
  );
}
export function AdminLegalRequests() {
  const allowed = useCanManage("admin"),
    r = useResource<Entity[]>(
      allowed ? "/admin/organizer-profile-requests" : null,
    );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Thay đổi pháp nhân BTC</Text>
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data?.map((row, index) => (
          <View key={value(row, "id") || String(index)} style={ui.card}>
            <DetailFields
              row={row}
              fields={[
                ["organization_name", "Tổ chức"],
                ["status", "Trạng thái"],
                ["created_at", "Ngày yêu cầu"],
              ]}
            />
            {!!row.requested_changes && (
              <DetailFields
                row={row.requested_changes as Entity}
                fields={[
                  ["businessName", "Tên pháp nhân mới"],
                  ["taxIdOrBusinessLicense", "Mã số thuế mới"],
                ]}
              />
            )}
            {row.status === "PENDING" && (
              <Decision
                endpoint={`/admin/organizer-profile-requests/${value(row, "id")}/review`}
                reload={r.reload}
              />
            )}
          </View>
        ))
      )}
      {!r.loading && !r.data?.length && (
        <Notice text="Chưa có yêu cầu thay đổi pháp nhân." />
      )}
    </Screen>
  );
}

export function AdminAdministrators() {
  const allowed = useCanManage("admin"),
    catalog = useResource<{ canManage: boolean }>(
      allowed ? "/admin/administrators/catalog" : null,
    );
  const [email, setEmail] = useState(""),
    [manager, setManager] = useState(false),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  async function grant() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.request("/admin/administrators", "POST", {
        email: email.trim().toLowerCase(),
        manager,
      });
      setEmail("");
      setConfirm(false);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <EntityList
      key={version}
      scope="admin"
      title="Quản trị viên"
      endpoint="/admin/administrators"
      summary={(row) =>
        `${value(row, "email")} · ${row.manager ? "Có quyền quản lý quản trị viên" : "Quản trị viên"} · ${row.locked ? "Đã khóa" : "Đang hoạt động"}`
      }
      onOpen={(row) => router.push(`/admin/administrators/${value(row, "id")}`)}
      header={
        <View style={{ gap: 12 }}>
          <Notice error text={catalog.error || error} />
          {catalog.data?.canManage && (
            <>
              <Field
                label="Email tài khoản nhận quyền quản trị"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!busy}
              />
              <View style={ui.row}>
                <Switch
                  accessibilityLabel="Cấp quyền quản lý quản trị viên"
                  value={manager}
                  onValueChange={setManager}
                  disabled={busy}
                />
                <Text style={{ ...ui.text, flex: 1 }}>
                  Cho phép quản lý quản trị viên
                </Text>
              </View>
              {confirm ? (
                <>
                  <Notice text="Xác nhận cấp quyền cho tài khoản đã đăng ký theo email trên?" />
                  <Button
                    title="Xác nhận cấp quyền quản trị"
                    disabled={busy}
                    onPress={() => void grant()}
                  />
                  <Button
                    title="Quay lại"
                    secondary
                    disabled={busy}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <Button
                  title="Cấp quyền quản trị viên"
                  disabled={busy || !email.trim()}
                  onPress={() => setConfirm(true)}
                />
              )}
            </>
          )}
        </View>
      }
    />
  );
}
function AdministratorForm({
  data,
  canManage,
}: {
  data: Entity;
  canManage: boolean;
}) {
  const [admin, setAdmin] = useState(
      (data.roles as string[]).includes("ADMIN"),
    ),
    [manager, setManager] = useState(!!data.manager),
    [locked, setLocked] = useState(!!data.locked),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.request(`/admin/administrators/${value(data, "id")}`, "PATCH", {
        version: value(data, "version"),
        admin,
        manager: admin && manager,
        locked,
        reason: reason.trim(),
      });
      router.replace("/admin/administrators");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DetailFields
        row={data}
        fields={[
          ["name", "Họ tên"],
          ["email", "Email"],
          ["status", "Trạng thái"],
        ]}
      />
      <Notice error text={error} />
      {canManage && (
        <>
          {[
            {
              label: "Quyền quản trị",
              val: admin,
              set: (v: boolean) => {
                setAdmin(v);
                if (!v) setManager(false);
              },
            },
            { label: "Quản lý quản trị viên", val: manager, set: setManager },
            { label: "Khóa tài khoản", val: locked, set: setLocked },
          ].map((item) => (
            <View key={item.label} style={ui.row}>
              <Switch
                accessibilityLabel={item.label}
                value={item.val}
                onValueChange={item.set}
                disabled={
                  busy || (item.label === "Quản lý quản trị viên" && !admin)
                }
              />
              <Text style={ui.text}>{item.label}</Text>
            </View>
          ))}
          <Field
            label="Lý do thay đổi quyền"
            value={reason}
            onChangeText={setReason}
            maxLength={1000}
            multiline
            editable={!busy}
          />
          {confirm ? (
            <>
              <Notice text="Thay đổi quyền có thể thu hồi các phiên của tài khoản này. Xác nhận tiếp tục?" />
              <Button
                title="Xác nhận cập nhật quyền"
                disabled={busy}
                onPress={() => void submit()}
              />
              <Button
                title="Quay lại"
                secondary
                disabled={busy}
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <Button
              title="Cập nhật quyền"
              disabled={busy || reason.trim().length < 3}
              onPress={() => setConfirm(true)}
            />
          )}
        </>
      )}
    </>
  );
}
export function AdminAdministratorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin"),
    r = useResource<Entity>(allowed ? `/admin/administrators/${id}` : null),
    catalog = useResource<{ canManage: boolean }>(
      allowed ? "/admin/administrators/catalog" : null,
    );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Quyền quản trị viên</Text>
      <Notice error text={r.error || catalog.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <AdministratorForm
            key={value(r.data, "version")}
            data={r.data}
            canManage={catalog.data?.canManage === true}
          />
        )
      )}
    </Screen>
  );
}

export function AdminTransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("admin"),
    r = useResource<Entity>(allowed ? `/admin/sepay/transactions/${id}` : null);
  const [action, setAction] = useState<"reprocess" | "resolve" | null>(null),
    [outcome, setOutcome] = useState("unmatched"),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit() {
    if (busy || !action) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.request(
        `/admin/sepay/transactions/${id}/${action}`,
        "POST",
        action === "reprocess"
          ? {}
          : {
              outcome,
              reason: reason.trim(),
              evidenceReference: reference.trim() || null,
            },
      );
      setAction(null);
      setNotice("Đã ghi nhận yêu cầu xử lý giao dịch.");
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Giao dịch SePay</Text>
      <Notice error text={r.error || error} />
      <Notice text={notice} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <DetailFields
              row={r.data}
              fields={[
                ["status", "Trạng thái"],
                ["amount", "Số tiền (VND)"],
                ["bank_code", "Ngân hàng"],
                ["account_masked", "Tài khoản"],
                ["payment_code", "Nội dung thanh toán"],
                ["reference_code", "Mã tham chiếu"],
                ["reason", "Lý do"],
                ["transaction_at", "Thời gian giao dịch"],
              ]}
            />
            {["REVIEW", "ERROR"].includes(value(r.data, "status")) && (
              <>
                <Button
                  title="Yêu cầu xử lý lại giao dịch"
                  secondary
                  onPress={() => setAction("reprocess")}
                />
                <Button
                  title="Ghi nhận kết quả xử lý"
                  secondary
                  onPress={() => setAction("resolve")}
                />
              </>
            )}
            {!!action && (
              <View style={ui.card}>
                <Text style={ui.h2}>
                  Xác nhận{" "}
                  {action === "reprocess" ? "xử lý lại" : "ghi nhận kết quả"}?
                </Text>
                {action === "resolve" && (
                  <>
                    {[
                      { key: "unmatched", label: "Chưa xác định giao dịch" },
                      {
                        key: "confirmed_external",
                        label: "Đã xác nhận bên ngoài",
                      },
                      {
                        key: "refund_external",
                        label: "Đã hoàn tiền bên ngoài",
                      },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        title={`${outcome === item.key ? "✓ " : ""}${item.label}`}
                        secondary
                        onPress={() => setOutcome(item.key)}
                      />
                    ))}
                    <Field
                      label="Lý do xử lý giao dịch"
                      value={reason}
                      onChangeText={setReason}
                      maxLength={1000}
                      multiline
                    />
                    <Field
                      label="Tham chiếu bằng chứng"
                      value={reference}
                      onChangeText={setReference}
                      maxLength={256}
                    />
                  </>
                )}
                <Button
                  title="Xác nhận xử lý giao dịch"
                  disabled={
                    busy || (action === "resolve" && reason.trim().length < 3)
                  }
                  onPress={() => void submit()}
                />
                <Button
                  title="Quay lại"
                  secondary
                  disabled={busy}
                  onPress={() => setAction(null)}
                />
              </View>
            )}
            {((r.data.history as Entity[]) ?? []).map((item, i) => (
              <DetailFields
                key={value(item, "id") || String(i)}
                row={item}
                fields={[
                  ["action", "Thao tác"],
                  ["reason", "Lý do"],
                  ["created_at", "Thời gian"],
                ]}
              />
            ))}
          </>
        )
      )}
    </Screen>
  );
}
