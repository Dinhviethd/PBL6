import { useEffect, useRef, useState } from "react";
import { Alert, Image, Platform, Text, View } from "react-native";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";
import {
  errorMessage,
  money,
  stateLabel,
  useResource,
  when,
} from "../../lib/data";
import { pickAndUploadImage } from "../../lib/media";
import {
  Button,
  Field,
  Loading,
  Notice,
  Pager,
  Screen,
  ui,
} from "../../components/ui";
import { DateTimeField } from "../../components/date-time-field";
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
  orderGroups,
  rangeParams,
  recentRange,
  type DateRange,
} from "../../lib/report-filters";
import { TicketDocumentActions } from "../../components/document-actions";
import { exportCsv } from "../../lib/document-export";
import { eventDraftStorage } from "../../lib/event-draft";
import { useSession } from "../../lib/session";
import { OrganizerEventPicker } from "../../components/organizer-event-picker";

const eventStatuses = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
];
function EventLinks({ id }: { id: string }) {
  return (
    <>
      {[
        ["tickets", "Loại vé"],
        ["orders", "Đơn hàng"],
        ["attendees", "Người tham dự"],
        ["staff", "Nhân viên check-in"],
        ["stats", "Thống kê"],
        ["checkins", "Lịch sử check-in"],
      ].map(([key, label]) => (
        <Button
          key={key}
          title={label}
          secondary
          onPress={() => router.push(`/organizer/events/${id}/${key}`)}
        />
      ))}
      <Button
        title="Mở máy quét QR"
        onPress={() =>
          router.push({ pathname: "/checkin/[id]", params: { id } })
        }
      />
    </>
  );
}
export function OrganizerHome() {
  const [range, setRange] = useState(() => recentRange());
  const [eventId, setEventId] = useState("");
  const allowed = useCanManage("organizer"),
    r = useResource<{
      totals: { revenue: string; sold: number; paidOrders: number };
      currentEventCounts: { onSale: number };
      dailySeries: DailyPoint[];
      upcomingEvents: {
        id: string;
        title: string;
        startsAt: string;
        venueName: string;
        sold: string;
        capacity: string;
      }[];
    }>(
      allowed
        ? `/organizer/dashboard?${rangeParams(range)}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""}`
        : null,
    );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Tổng quan Ban tổ chức</Text>
      <RangeFilter range={range} onChange={setRange} />
      <OrganizerEventPicker value={eventId} onChange={setEventId} />
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <MetricGrid
              items={[
                { label: "Doanh thu", value: money(r.data.totals.revenue) },
                { label: "Vé đã bán", value: r.data.totals.sold },
                { label: "Đơn đã thanh toán", value: r.data.totals.paidOrders },
                {
                  label: "Sự kiện mở bán",
                  value: r.data.currentEventCounts.onSale,
                },
              ]}
            />
            <RevenueChart series={r.data.dailySeries} />
            <Text style={ui.h2}>Sự kiện sắp diễn ra</Text>
            {r.data.upcomingEvents.map((event) => (
              <View key={event.id} style={ui.card}>
                <Text style={ui.h2}>{event.title}</Text>
                <Text style={ui.muted}>
                  {when(event.startsAt)} · {event.venueName}
                </Text>
                <Text style={ui.text}>
                  {event.sold}/{event.capacity} vé đã bán
                </Text>
                <Button
                  title={`Quản lý ${event.title}`}
                  secondary
                  onPress={() => router.push(`/organizer/events/${event.id}`)}
                />
              </View>
            ))}
            {!r.data.upcomingEvents.length && (
              <Notice text="Chưa có sự kiện sắp diễn ra." />
            )}
          </>
        )
      )}
      <Button
        title="Quản lý sự kiện"
        onPress={() => router.push("/organizer/events")}
      />
      <Button
        title="Tạo sự kiện"
        secondary
        onPress={() => router.push("/organizer/events/new")}
      />
      <Button
        title="Hồ sơ tổ chức và đội ngũ"
        secondary
        onPress={() => router.push("/organizer/profile")}
      />
    </Screen>
  );
}
export function OrganizerEvents() {
  return (
    <EntityList
      scope="organizer"
      title="Sự kiện của bạn"
      endpoint="/organizer/events"
      statuses={eventStatuses}
      header={
        <Button
          title="Tạo sự kiện"
          onPress={() => router.push("/organizer/events/new")}
        />
      }
      summary={(row) =>
        `${when(value(row, "starts_at"))} · ${value(row, "venue_name")}\nVé: ${value(row, "sold_quantity")}/${value(row, "capacity")} · Doanh thu: ${money(value(row, "revenue"))}`
      }
      onOpen={(row) => router.push(`/organizer/events/${value(row, "id")}`)}
    />
  );
}
export function OrganizerEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("organizer"),
    r = useResource<Entity>(allowed ? `/organizer/events/${id}` : null);
  const [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function perform() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.request(
        `/organizer/events/${id}/${action}`,
        "POST",
        action === "pause"
          ? { paused: !r.data?.sales_paused }
          : action === "cancel"
            ? { reason }
            : {},
      );
      setAction("");
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Notice error text={r.error || error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <Text style={ui.title}>{value(r.data, "title")}</Text>
            <Text style={ui.badge}>{stateLabel(value(r.data, "status"))}</Text>
            <DetailFields
              row={r.data}
              fields={[
                ["venue_name", "Địa điểm"],
                ["address", "Địa chỉ"],
                ["starts_at", "Bắt đầu"],
                ["ends_at", "Kết thúc"],
                ["description", "Mô tả"],
              ]}
            />
            <EventLinks id={id} />
            {["DRAFT", "REJECTED", "PUBLISHED"].includes(
              value(r.data, "status"),
            ) && (
              <Button
                title="Chỉnh sửa sự kiện"
                secondary
                onPress={() => router.push(`/organizer/events/${id}/edit`)}
              />
            )}
            {["DRAFT", "REJECTED"].includes(value(r.data, "status")) && (
              <Button
                title="Gửi sự kiện xét duyệt"
                onPress={() => setAction("submit")}
              />
            )}
            {r.data.status === "PUBLISHED" && (
              <Button
                title={
                  r.data.sales_paused ? "Tiếp tục bán vé" : "Tạm dừng bán vé"
                }
                secondary
                onPress={() => setAction("pause")}
              />
            )}
            {r.data.status !== "CANCELLED" && (
              <Button
                title="Hủy sự kiện"
                secondary
                onPress={() => setAction("cancel")}
              />
            )}
            {!!action && (
              <View style={ui.card}>
                <Text style={ui.h2}>
                  Xác nhận{" "}
                  {action === "submit"
                    ? "gửi duyệt"
                    : action === "cancel"
                      ? "hủy sự kiện"
                      : "thay đổi trạng thái bán vé"}
                  ?
                </Text>
                {action === "cancel" && (
                  <Field
                    label="Lý do hủy sự kiện"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    maxLength={2000}
                  />
                )}
                <Button
                  title="Xác nhận thao tác"
                  disabled={busy || (action === "cancel" && !reason.trim())}
                  onPress={() => void perform()}
                />
                <Button
                  title="Quay lại"
                  secondary
                  disabled={busy}
                  onPress={() => setAction("")}
                />
              </View>
            )}
          </>
        )
      )}
    </Screen>
  );
}
type EventForm = Record<string, string>;
const eventFields: [string, string, number][] = [
  ["title", "Tên sự kiện", 200],
  ["description", "Mô tả sự kiện", 20000],
  ["venueName", "Tên địa điểm", 200],
  ["address", "Địa chỉ", 1000],
  ["cityCode", "Tỉnh / Thành phố", 32],
];
const timeFields: [string, string][] = [
  ["startsAt", "Bắt đầu sự kiện"],
  ["endsAt", "Kết thúc sự kiện"],
  ["checkinOpensAt", "Mở check-in"],
  ["checkinClosesAt", "Đóng check-in"],
];
function EventFormView({ initial, id }: { initial?: Entity; id?: string }) {
  const { user } = useSession(),
    navigation = useNavigation();
  const [draft, setDraft] =
    useState<
      Awaited<ReturnType<Awaited<ReturnType<typeof eventDraftStorage>>["read"]>>
    >(null);
  const [draftNotice, setDraftNotice] = useState(""),
    [savedId, setSavedId] = useState("");
  const storage = useRef<Awaited<ReturnType<typeof eventDraftStorage>> | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    eventDraftStorage(user!.idUser, id ?? "new")
      .then(async (s) => {
        if (!active) return;
        storage.current = s;
        const d = await s.read();
        if (active) setDraft(d);
      })
      .catch(() => {
        if (active)
          setDraftNotice(
            "Chưa đọc được bản nháp trên máy. Bạn vẫn có thể lưu sự kiện lên server.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, user]);
  const initialForm = Object.fromEntries([
    ...eventFields.map(([key]) => [
      key,
      value(
        initial ?? {},
        (
          { venueName: "venue_name", cityCode: "city_code" } as Record<
            string,
            string
          >
        )[key] ?? key,
      ),
    ]),
    ...timeFields.map(([key]) => [
      key,
      value(
        initial ?? {},
        (
          {
            startsAt: "starts_at",
            endsAt: "ends_at",
            checkinOpensAt: "checkin_opens_at",
            checkinClosesAt: "checkin_closes_at",
          } as Record<string, string>
        )[key],
      ),
    ]),
    ["categoryId", value(initial ?? {}, "category_id")],
    ["coverImageUrl", value(initial ?? {}, "cover_image_url")],
  ]);
  const [form, setForm] = useState<EventForm>(initialForm),
    [step, setStep] = useState(0),
    [sheet, setSheet] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const categories = useResource<Entity[]>("/categories"),
    lock = useRef(false);
  const [baseline] = useState(() => JSON.stringify(initialForm));
  const dirty = JSON.stringify(form) !== baseline;
  usePreventRemove((dirty || busy) && !savedId, ({ data }) => {
    if (busy) {
      if (Platform.OS !== "web")
        Alert.alert("Đang lưu", "Vui lòng chờ thao tác hoàn tất.");
      return;
    }
    const leave = () => navigation.dispatch(data.action);
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Thay đổi chưa gửi lên server. Rời màn hình? Hãy lưu nháp nếu muốn tiếp tục sau.",
        )
      )
        leave();
    } else
      Alert.alert(
        "Rời biểu mẫu?",
        "Thay đổi chưa gửi lên server. Hãy lưu nháp nếu muốn tiếp tục sau.",
        [
          { text: "Tiếp tục sửa", style: "cancel" },
          { text: "Rời màn hình", style: "destructive", onPress: leave },
        ],
      );
  });
  useEffect(() => {
    if (savedId) router.replace(`/organizer/events/${savedId}`);
  }, [savedId]);
  const update = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));
  async function image() {
    setBusy(true);
    setError("");
    try {
      const url = await pickAndUploadImage();
      if (url) update("coverImageUrl", url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (lock.current) return;
    if (eventFields.some(([key]) => !form[key]?.trim()) || !form.categoryId) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn danh mục.");
      return;
    }
    if (timeFields.some(([key]) => !Number.isFinite(Date.parse(form[key])))) {
      setError("Chọn đầy đủ ngày giờ hợp lệ.");
      return;
    }
    if (
      Date.parse(form.startsAt) >= Date.parse(form.endsAt) ||
      Date.parse(form.checkinOpensAt) >= Date.parse(form.checkinClosesAt) ||
      Date.parse(form.checkinClosesAt) > Date.parse(form.endsAt)
    ) {
      setError(
        "Thời gian bắt đầu phải trước kết thúc; check-in phải đóng trước khi sự kiện kết thúc.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        ...Object.fromEntries(
          timeFields.map(([key]) => [key, new Date(form[key]).toISOString()]),
        ),
      };
      if (!payload.coverImageUrl) delete payload.coverImageUrl;
      const result = await api.request<Entity>(
        id ? `/organizer/events/${id}` : "/organizer/events",
        id ? "PATCH" : "POST",
        payload,
      );
      try {
        await storage.current?.clear();
      } catch {
        /* Server save already succeeded. */
      }
      setSavedId(value(result, "id"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={ui.title}>{id ? "Sửa sự kiện" : "Tạo sự kiện"}</Text>
      <Text style={ui.eyebrow}>
        BƯỚC {step + 1}/3 · NỘI DUNG → THỜI GIAN → XEM LẠI
      </Text>
      <Notice error text={error || categories.error} />
      <Notice text={draftNotice} />
      {draft && (
        <View style={ui.card}>
          <Text style={ui.h2}>Có bản nháp trên thiết bị</Text>
          <Text style={ui.muted}>
            Đã lưu {when(draft.savedAt)}. Khôi phục sẽ thay nội dung đang nhập;
            dữ liệu server chỉ thay đổi khi bạn bấm Lưu sự kiện.
          </Text>
          <Button
            title="Khôi phục bản nháp"
            secondary
            disabled={busy}
            onPress={() => {
              setForm({ ...initialForm, ...draft.values });
              setDraft(null);
              setDraftNotice(
                "Đã khôi phục bản nháp. Hãy kiểm tra lại trước khi lưu sự kiện.",
              );
            }}
          />
          <Button
            title="Bỏ bản nháp trên máy"
            secondary
            disabled={busy}
            onPress={() => {
              void storage.current
                ?.clear()
                .then(() => setDraft(null))
                .catch((e) => setError(errorMessage(e)));
            }}
          />
        </View>
      )}
      <Button
        title="Lưu nháp trên thiết bị"
        secondary
        disabled={busy}
        onPress={() => {
          if (!storage.current) {
            setError("Bộ nhớ bản nháp chưa sẵn sàng. Vui lòng thử lại.");
            return;
          }
          void storage.current
            .write(form)
            .then(() =>
              setDraftNotice(
                "Đã lưu nháp trên thiết bị. Bạn có thể quay lại để khôi phục.",
              ),
            )
            .catch((e) => setError(errorMessage(e)));
        }}
      />
      {step === 0 ? (
        <>
          {eventFields.map(([key, label, max]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              onChangeText={(val) => update(key, val)}
              maxLength={max}
              multiline={key === "description"}
              editable={!busy}
            />
          ))}
          <Button
            title={`Danh mục: ${value(categories.data?.find((c) => c.id === form.categoryId) ?? {}, "name") || "Chọn danh mục"}`}
            secondary
            onPress={() => setSheet(true)}
          />
          <Button
            title="Chọn ảnh bìa"
            secondary
            disabled={busy}
            onPress={() => void image()}
          />
          {!!form.coverImageUrl && <Notice text="Đã tải ảnh bìa lên." />}
        </>
      ) : step === 1 ? (
        timeFields.map(([key, label]) => (
          <DateTimeField
            key={key}
            label={label}
            value={form[key]}
            onChange={(val) => update(key, val)}
          />
        ))
      ) : (
        <DetailFields
          row={form}
          fields={[
            ...eventFields.map(([key, label]): [string, string] => [
              key,
              label,
            ]),
            ...timeFields,
          ]}
        />
      )}
      {step < 2 ? (
        <Button
          title="Tiếp tục"
          disabled={busy}
          onPress={() => setStep((s) => s + 1)}
        />
      ) : (
        <Button
          title={busy ? "Đang lưu…" : "Lưu sự kiện"}
          disabled={busy}
          onPress={() => void save()}
        />
      )}
      {step > 0 && (
        <Button
          title="Bước trước"
          secondary
          disabled={busy}
          onPress={() => setStep((s) => s - 1)}
        />
      )}
      <HomeSheet
        title="Danh mục sự kiện"
        visible={sheet}
        onClose={() => setSheet(false)}
      >
        {categories.data?.map((c) => (
          <Button
            key={value(c, "id")}
            title={value(c, "name")}
            secondary
            onPress={() => {
              update("categoryId", value(c, "id"));
              setSheet(false);
            }}
          />
        ))}
      </HomeSheet>
    </Screen>
  );
}
export function OrganizerCreateEvent() {
  return <EventFormView />;
}
export function OrganizerEditEvent() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("organizer"),
    r = useResource<Entity>(allowed ? `/organizer/events/${id}` : null);
  return r.data ? (
    <EventFormView key={id} id={id} initial={r.data} />
  ) : (
    <Screen>
      {r.loading ? (
        <Loading />
      ) : (
        <>
          <Notice error text={r.error} />
          <Button title="Thử lại" onPress={r.reload} />
        </>
      )}
    </Screen>
  );
}

export function OrganizerTickets() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("organizer"),
    r = useResource<Entity>(allowed ? `/organizer/events/${id}` : null);
  const [form, setForm] = useState<Record<string, string> | null>(null),
    [editing, setEditing] = useState(""),
    [remove, setRemove] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const types = (r.data?.ticketTypes as Entity[] | undefined) ?? [];
  function edit(item?: Entity) {
    setEditing(item ? value(item, "id") : "");
    setForm({
      name: value(item ?? {}, "name"),
      description: value(item ?? {}, "description"),
      price: value(item ?? {}, "price_amount"),
      capacity: value(item ?? {}, "capacity"),
      saleStartsAt: value(item ?? {}, "sale_starts_at"),
      saleEndsAt: value(item ?? {}, "sale_ends_at"),
    });
  }
  async function save(deleting = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (deleting)
        await api.request(
          `/organizer/events/${id}/ticket-types/${remove}`,
          "DELETE",
        );
      else if (form)
        await api.request(
          `/organizer/events/${id}/ticket-types${editing ? `/${editing}` : ""}`,
          editing ? "PATCH" : "POST",
          {
            ...form,
            capacity: Number(form.capacity),
            saleStartsAt: new Date(form.saleStartsAt).toISOString(),
            saleEndsAt: new Date(form.saleEndsAt).toISOString(),
          },
        );
      setForm(null);
      setRemove("");
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Loại vé</Text>
      <Notice error text={r.error || error} />
      {r.loading && !r.data && <Loading />}
      {types
        .filter((t) => !t.archived_at)
        .map((t) => (
          <View key={value(t, "id")} style={ui.card}>
            <Text style={ui.h2}>{value(t, "name")}</Text>
            <Text style={ui.text}>
              {money(value(t, "price_amount"))} · {value(t, "sold_quantity")}/
              {value(t, "capacity")} vé bán
            </Text>
            <Button
              title={`Sửa ${value(t, "name")}`}
              secondary
              onPress={() => edit(t)}
            />
            <Button
              title={`Ẩn ${value(t, "name")}`}
              secondary
              onPress={() => setRemove(value(t, "id"))}
            />
          </View>
        ))}
      {!types.length && !r.loading && (
        <Notice text="Chưa có loại vé. Thêm loại vé trước khi gửi duyệt." />
      )}
      <Button title="Thêm loại vé" onPress={() => edit()} />
      {remove && (
        <View style={ui.card}>
          <Text style={ui.text}>Xác nhận ẩn loại vé này?</Text>
          <Button
            title="Xác nhận ẩn loại vé"
            disabled={busy}
            onPress={() => void save(true)}
          />
          <Button title="Giữ loại vé" secondary onPress={() => setRemove("")} />
        </View>
      )}
      <HomeSheet
        title={editing ? "Sửa loại vé" : "Thêm loại vé"}
        visible={!!form}
        onClose={() => {
          if (!busy) setForm(null);
        }}
      >
        {form && (
          <>
            {[
              ["name", "Tên loại vé"],
              ["description", "Mô tả"],
              ["price", "Giá vé (VND)"],
              ["capacity", "Số lượng vé"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={form[key]}
                keyboardType={
                  ["price", "capacity"].includes(key) ? "number-pad" : "default"
                }
                onChangeText={(val) => setForm((f) => ({ ...f!, [key]: val }))}
                editable={!busy}
              />
            ))}
            <DateTimeField
              label="Mở bán"
              value={form.saleStartsAt}
              onChange={(val) => setForm((f) => ({ ...f!, saleStartsAt: val }))}
            />
            <DateTimeField
              label="Đóng bán"
              value={form.saleEndsAt}
              onChange={(val) => setForm((f) => ({ ...f!, saleEndsAt: val }))}
            />
            <Notice error text={error} />
            <Button
              title="Lưu loại vé"
              disabled={busy}
              onPress={() => void save()}
            />
          </>
        )}
      </HomeSheet>
    </Screen>
  );
}

export function OrganizerOrders() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [range, setRange] = useState<DateRange>({ fromDate: "", toDate: "" });
  return (
    <EntityList
      scope="organizer"
      title="Đơn hàng sự kiện"
      endpoint={`/organizer/events/${id}/order-manager`}
      header={<RangeFilter range={range} optional onChange={setRange} />}
      extra={`&${rangeParams(range)}`}
      statusKey="group"
      statuses={orderGroups.filter((o) => o.value !== "all")}
      titleFor={(row) => value(row, "orderCode")}
      listSummary={(data) => (
        <MetricGrid
          items={[
            {
              label: "Đơn trong bộ lọc",
              value: String((data.summary as Entity).totalOrders),
            },
            {
              label: "Doanh thu đã trả",
              value: money(String((data.summary as Entity).revenuePaid)),
            },
          ]}
        />
      )}
      summary={(row) =>
        `${value(row.buyer as Entity, "name")} · ${value(row.event as Entity, "title")}\n${money(value(row, "totalAmount"))} · ${when(value(row, "createdAt"))}${(row.payment as Entity)?.unresolvedReview ? "\nCần tra soát thanh toán" : ""}`
      }
      onOpen={(row) =>
        router.push(`/organizer/events/${id}/orders/${value(row, "id")}`)
      }
    />
  );
}
export function OrganizerOrderDetail() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { id, orderId } = useLocalSearchParams<{
      id: string;
      orderId: string;
    }>(),
    allowed = useCanManage("organizer"),
    r = useResource<Entity>(
      allowed ? `/organizer/events/${id}/orders/${orderId}` : null,
    );
  const preview = useResource<{ tickets: Entity[] }>(
    allowed && previewOpen
      ? `/organizer/events/${id}/orders/${orderId}/tickets`
      : null,
  );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Chi tiết đơn hàng</Text>
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <DetailFields
              row={r.data}
              fields={[
                ["orderCode", "Mã đơn"],
                ["status", "Trạng thái"],
                ["createdAt", "Thời điểm tạo"],
                ["totalQuantity", "Số vé"],
              ]}
            />
            <Text style={ui.h2}>{money(value(r.data, "totalAmount"))}</Text>
            <DetailFields
              row={r.data.buyer as Entity}
              fields={[
                ["name", "Người mua"],
                ["email", "Email"],
                ["phone", "Điện thoại"],
              ]}
            />
            {(r.data.items as Entity[]).map((item, i) => (
              <DetailFields
                key={i}
                row={item}
                fields={[
                  ["typeName", "Loại vé"],
                  ["quantity", "Số lượng"],
                  ["lineTotal", "Thành tiền (VND)"],
                ]}
              />
            ))}
            {(r.data.tickets as Entity[]).map((t) => (
              <DetailFields
                key={value(t, "id")}
                row={t}
                fields={[
                  ["code", "Mã vé"],
                  ["status", "Trạng thái vé"],
                  ["checkedInAt", "Check-in"],
                ]}
              />
            ))}
            <Text style={ui.h2}>Thanh toán</Text>
            {(r.data.payment as Entity)?.unresolvedReview === true && (
              <Notice text="Đơn đang được tra soát. Chỉ dùng vé khi máy chủ xác nhận hợp lệ." />
            )}
            {(r.data.payment as Entity)?.display ? (
              <DetailFields
                row={(r.data.payment as Entity).display as Entity}
                fields={[
                  ["provider", "Cổng thanh toán"],
                  ["status", "Trạng thái"],
                  ["amount", "Số tiền (VND)"],
                  ["succeededAt", "Thanh toán lúc"],
                ]}
              />
            ) : (
              <Text style={ui.muted}>Chưa có giao dịch thanh toán.</Text>
            )}
            {!!r.data.bankAccount && (
              <DetailFields
                row={r.data.bankAccount as Entity}
                fields={[
                  ["bankCode", "Ngân hàng"],
                  ["accountNumber", "Số tài khoản tại thời điểm thanh toán"],
                  ["accountName", "Chủ tài khoản"],
                ]}
              />
            )}
            <Text style={ui.h2}>Lịch sử xử lý đơn</Text>
            {((r.data.timeline as Entity[]) ?? []).map((entry) => (
              <View key={value(entry, "id")} style={ui.card}>
                <Text style={ui.h2}>
                  {{
                    ORDER_CREATED: "Đã tạo đơn",
                    VIETQR_WINDOW: "Thời hạn VietQR",
                    PAYMENT_SUCCEEDED: "Đã xác nhận thanh toán",
                    QR_ISSUED: "Đã phát hành vé",
                  }[value(entry, "type")] ?? value(entry, "type")}
                </Text>
                <Text style={ui.text}>
                  {entry.occurredAt
                    ? when(value(entry, "occurredAt"))
                    : `${when(value(entry, "paymentCreatedAt"))} → ${when(value(entry, "effectiveWindowEndsAt"))}`}
                </Text>
                {!!entry.ticketCode && (
                  <Text selectable style={ui.muted}>
                    {value(entry, "ticketCode")}
                  </Text>
                )}
              </View>
            ))}
            {(r.data.actions as Entity)?.canPreviewTickets === true && (
              <Button
                title="Xem vé và mã QR"
                onPress={() => setPreviewOpen(true)}
              />
            )}
            {(r.data.actions as Entity)?.canPrintTickets === true && (
              <TicketDocumentActions
                load={async () => {
                  const latest = await api.request<{
                    event: {
                      title: string;
                      startsAt: string;
                      venueName: string;
                    };
                    tickets: {
                      code: string;
                      typeName: string;
                      status: string;
                      qrImage: string | null;
                      buyerName: string;
                      printable: boolean;
                    }[];
                  }>(`/organizer/events/${id}/orders/${orderId}/tickets`);
                  const tickets = latest.tickets
                    .filter((t) => t.printable)
                    .map((t) => ({
                      ...t,
                      eventTitle: latest.event.title,
                      startsAt: latest.event.startsAt,
                      venueName: latest.event.venueName,
                    }));
                  return tickets;
                }}
              />
            )}
            <HomeSheet
              visible={previewOpen}
              title="Vé của đơn hàng"
              onClose={() => setPreviewOpen(false)}
            >
              <Notice error text={preview.error} />
              {preview.loading ? (
                <Loading />
              ) : (
                preview.data?.tickets.map((t) => (
                  <View style={ui.card} key={value(t, "id")}>
                    <Text style={ui.h2}>{value(t, "typeName")}</Text>
                    <Text style={ui.badge}>
                      {stateLabel(value(t, "status"))}
                    </Text>
                    {t.qrImage ? (
                      <Image
                        accessibilityLabel={`Mã QR vé ${value(t, "code")}`}
                        source={{ uri: value(t, "qrImage") }}
                        style={{
                          width: "100%",
                          aspectRatio: 1,
                          maxWidth: 320,
                          alignSelf: "center",
                          backgroundColor: "white",
                        }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Notice text="Mã QR không khả dụng cho vé này." />
                    )}
                    <Text selectable style={ui.text}>
                      {value(t, "code")}
                    </Text>
                  </View>
                ))
              )}
              {preview.error && (
                <Button title="Tải lại vé" secondary onPress={preview.reload} />
              )}
            </HomeSheet>
          </>
        )
      )}
    </Screen>
  );
}
export function OrganizerAttendees() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCanManage("organizer"),
    event = useResource<Entity>(allowed ? `/organizer/events/${id}` : null);
  const [type, setType] = useState("");
  return (
    <EntityList
      scope="organizer"
      title="Người tham dự"
      endpoint={`/organizer/events/${id}/attendees`}
      envelope
      extra={`&paginated=true&limit=10${type ? `&ticketTypeId=${encodeURIComponent(type)}` : ""}`}
      statuses={[
        { value: "VALID", label: "Chưa check-in" },
        { value: "CHECKED_IN", label: "Đã check-in" },
      ]}
      titleFor={(row) =>
        value(row, "buyer_name_snapshot") || value(row, "ticket_code")
      }
      header={
        <>
          <Notice error text={event.error} />
          <ChoiceFilter
            label="Loại vé"
            value={type}
            onChange={setType}
            options={[
              { value: "", label: "Tất cả loại vé" },
              ...((event.data?.ticketTypes as Entity[]) ?? []).map((t) => ({
                value: value(t, "id"),
                label: value(t, "name"),
              })),
            ]}
          />
        </>
      }
      listSummary={(data) => (
        <Text style={ui.muted}>
          {String((data.pagination as Entity).total)} người tham dự phù hợp
        </Text>
      )}
      summary={(row) =>
        `${value(row, "buyer_name_snapshot")} · ${value(row, "buyer_email_snapshot")}\n${value(row, "ticket_type_name_snapshot")} · ${value(row, "ticket_code")}`
      }
    />
  );
}
export function OrganizerCheckins() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EntityList
      scope="organizer"
      title="Lịch sử check-in"
      searchable={false}
      endpoint={`/organizer/events/${id}/checkins`}
      summary={(row) =>
        `${value(row, "ticket_code")} · ${value(row, "checked_in_by_name")}\n${when(value(row, "checked_in_at"))} · ${value(row, "method")}`
      }
    />
  );
}
export function OrganizerStats() {
  const [range, setRange] = useState(() => recentRange());
  const [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("organizer"),
    r = useResource<{
      totals: { revenue: string; sold: number; paidOrders: number };
      ticketTypes: Entity[];
      range: { fromDate: string; toDate: string };
      dailySeries: DailyPoint[];
    }>(
      allowed
        ? `/organizer/events/${id}/analytics?${rangeParams(range)}`
        : null,
    );
  const overall = useResource<Entity>(
    allowed ? `/organizer/events/${id}/stats` : null,
  );
  return (
    <Screen
      refresh={() => {
        r.reload();
        overall.reload();
      }}
      loading={r.loading || overall.loading}
    >
      <Text style={ui.title}>Thống kê sự kiện</Text>
      <Notice error text={overall.error} />
      {overall.data && (
        <>
          <Text style={ui.h2}>Tổng toàn sự kiện</Text>
          <MetricGrid
            items={[
              {
                label: "Doanh thu toàn sự kiện",
                value: money(value(overall.data, "revenue")),
              },
              {
                label: "Vé đã bán toàn sự kiện",
                value: value(overall.data, "sold"),
              },
              {
                label: "Lượt check-in",
                value: value(overall.data, "checkins"),
              },
            ]}
          />
        </>
      )}
      <Text style={ui.h2}>Phân tích trong kỳ</Text>
      <RangeFilter range={range} onChange={setRange} />
      <Button
        title={exporting ? "Đang xuất báo cáo…" : "Xuất báo cáo CSV"}
        disabled={exporting || !r.data}
        secondary
        onPress={() => {
          if (exporting) return;
          setExporting(true);
          setExportError("");
          const generation = api.sessionVersion();
          api
            .request<string>(
              `/organizer/events/${id}/analytics/export.csv?${rangeParams(range)}`,
              "GET",
              undefined,
              {},
              "text",
            )
            .then((text) =>
              exportCsv(
                text,
                `event-${id}`,
                () => generation === api.sessionVersion(),
              ),
            )
            .catch((e) => setExportError(errorMessage(e)))
            .finally(() => setExporting(false));
        }}
      />
      <Notice error text={exportError} />
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data && (
          <>
            <Text style={ui.muted}>
              {r.data.range.fromDate} → {r.data.range.toDate}
            </Text>
            <MetricGrid
              items={[
                {
                  label: "Doanh thu trong kỳ",
                  value: money(r.data.totals.revenue),
                },
                { label: "Vé bán trong kỳ", value: r.data.totals.sold },
                { label: "Đơn đã trả", value: r.data.totals.paidOrders },
              ]}
            />
            <RevenueChart series={r.data.dailySeries} />
            {r.data.ticketTypes.map((t) => (
              <DetailFields
                key={value(t, "id")}
                row={t}
                fields={[
                  ["name", "Loại vé"],
                  ["sold", "Đã bán"],
                  ["capacity", "Sức chứa"],
                  ["revenue", "Doanh thu (VND)"],
                ]}
              />
            ))}
          </>
        )
      )}
    </Screen>
  );
}

export function OrganizerStaff() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useCanManage("organizer");
  const [page, setPage] = useState(0),
    [email, setEmail] = useState(""),
    [remove, setRemove] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const r = useResource<Entity[]>(
    allowed ? `/organizer/events/${id}/staff?page=${page}` : null,
  );
  async function act(deleting = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.request(
        `/organizer/events/${id}/staff${deleting ? `/${remove}` : ""}`,
        deleting ? "DELETE" : "POST",
        deleting ? undefined : { email: email.trim().toLowerCase() },
      );
      setRemove("");
      setEmail("");
      setNotice(
        deleting ? "Đã thu hồi phân công." : "Đã gửi lời mời check-in.",
      );
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Nhân viên check-in</Text>
      <Notice error text={r.error || error} />
      <Notice text={notice} />
      <Field
        label="Email nhân viên"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!busy}
      />
      <Button
        title="Mời nhân viên check-in"
        disabled={busy || !email.trim()}
        onPress={() => void act()}
      />
      {r.loading && !r.data ? (
        <Loading />
      ) : (
        r.data?.map((member) => (
          <View style={ui.card} key={value(member, "id")}>
            <Text style={ui.h2}>{value(member, "staff_name")}</Text>
            <Text style={ui.text}>{value(member, "staff_email")}</Text>
            <Text style={ui.badge}>{value(member, "status")}</Text>
            {member.status !== "REVOKED" && (
              <Button
                title="Thu hồi phân công"
                secondary
                disabled={busy}
                onPress={() => setRemove(value(member, "id"))}
              />
            )}
          </View>
        ))
      )}
      {!r.loading && !r.data?.length && (
        <Notice text="Chưa có nhân viên trong trang này." />
      )}
      {!!remove && (
        <View style={ui.card}>
          <Text style={ui.text}>Thu hồi quyền check-in của nhân viên này?</Text>
          <Button
            title="Xác nhận thu hồi"
            disabled={busy}
            onPress={() => void act(true)}
          />
          <Button
            title="Giữ phân công"
            secondary
            disabled={busy}
            onPress={() => setRemove("")}
          />
        </View>
      )}
      <Pager
        page={page}
        setPage={setPage}
        more={r.data?.length === 50}
        loading={r.loading}
        error={!!r.error}
      />
    </Screen>
  );
}

const profileFields: [string, string, number][] = [
  ["organizationName", "Tên tổ chức", 200],
  ["contactName", "Người liên hệ", 150],
  ["contactEmail", "Email liên hệ", 254],
  ["contactPhone", "Điện thoại liên hệ", 30],
  ["headOfficeAddress", "Trụ sở", 500],
  ["description", "Giới thiệu", 4000],
  ["websiteOrSocial", "Website / Mạng xã hội", 500],
];
function OrganizerProfileForm({
  profile,
  reload,
}: {
  profile: Entity;
  reload: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(
      profileFields.map(([key]) => [key, value(profile, key)]),
    ),
  );
  const [business, setBusiness] = useState(value(profile, "businessName")),
    [tax, setTax] = useState(value(profile, "taxIdOrBusinessLicense"));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [version, setVersion] = useState(value(profile, "version"));
  async function save(legal = false, logo = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (legal) {
        await api.request("/organizer/profile/legal-requests", "POST", {
          version,
          changes: {
            businessName: business.trim(),
            taxIdOrBusinessLicense: tax.trim(),
          },
        });
        setNotice(
          "Đã gửi yêu cầu thay đổi pháp nhân. Chờ quản trị viên xét duyệt.",
        );
      } else {
        const logoUrl = logo ? await pickAndUploadImage() : undefined;
        if (logo && !logoUrl) return;
        const data = await api.request<Entity>("/organizer/profile", "PATCH", {
          version,
          ...(logo
            ? { logoUrl }
            : Object.fromEntries(
                Object.entries(form)
                  .filter(([, val]) => val.trim())
                  .map(([key, val]) => [key, val.trim()]),
              )),
        });
        setVersion(value(data, "version"));
        setNotice(logo ? "Đã cập nhật logo tổ chức." : "Đã lưu hồ sơ tổ chức.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice error text={error} />
      <Notice text={notice} />
      {profileFields.map(([key, label, max]) => (
        <Field
          key={key}
          label={label}
          value={form[key]}
          onChangeText={(val) => setForm((f) => ({ ...f, [key]: val }))}
          maxLength={max}
          multiline={key === "description"}
          editable={!busy}
        />
      ))}
      <Button
        title="Lưu hồ sơ tổ chức"
        disabled={busy}
        onPress={() => void save()}
      />
      <Button
        title="Thay logo tổ chức"
        secondary
        disabled={busy}
        onPress={() => void save(false, true)}
      />
      <Text style={ui.h2}>Thay đổi pháp nhân</Text>
      <Text style={ui.muted}>
        Thông tin pháp nhân cần được quản trị viên xét duyệt.
      </Text>
      <Field
        label="Tên pháp nhân mới"
        value={business}
        onChangeText={setBusiness}
        editable={!busy}
        maxLength={200}
      />
      <Field
        label="Mã số thuế / Giấy phép mới"
        value={tax}
        onChangeText={setTax}
        editable={!busy}
        maxLength={100}
      />
      <Button
        title="Gửi yêu cầu thay đổi pháp nhân"
        secondary
        disabled={busy || !business.trim() || !tax.trim()}
        onPress={() => void save(true)}
      />
      <Button
        title="Tải lại hồ sơ mới nhất"
        secondary
        disabled={busy}
        onPress={reload}
      />
    </>
  );
}
export function OrganizerProfile() {
  const allowed = useCanManage("organizer"),
    r = useResource<Entity>(allowed ? "/organizer/profile" : null);
  const history = useResource<Entity[]>(
    allowed ? "/organizer/profile/legal-requests" : null,
  );
  return (
    <Screen refresh={r.reload} loading={r.loading}>
      <Text style={ui.title}>Hồ sơ Ban tổ chức</Text>
      <Notice error text={r.error} />
      {r.loading && !r.data ? (
        <Loading />
      ) : r.data?.initialized ? (
        <OrganizerProfileForm
          key={value(r.data, "version")}
          profile={r.data}
          reload={() => {
            r.reload();
            history.reload();
          }}
        />
      ) : (
        !r.error && (
          <Notice text="Tài khoản chưa có hồ sơ tổ chức được duyệt. Liên hệ quản trị viên để kiểm tra hồ sơ." />
        )
      )}
      <Text style={ui.h2}>Yêu cầu thay đổi pháp nhân</Text>
      <Notice error text={history.error} />
      {history.data?.map((item, index) => (
        <DetailFields
          key={value(item, "id") || String(index)}
          row={item}
          fields={[
            ["status", "Trạng thái"],
            ["created_at", "Ngày yêu cầu"],
            ["reason", "Phản hồi"],
          ]}
        />
      ))}
      <Button
        title="Quản lý đội ngũ Ban tổ chức"
        secondary
        onPress={() => router.push("/organizer/team")}
      />
    </Screen>
  );
}
