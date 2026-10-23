import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionForm } from "@/components/ticketing/action-form";
import { Field, ImageField, Loading, Notice, PageHead, Status } from "@/components/ticketing/shared";
import api from "@/lib/api";
import { local, iso, eventTime } from "@/features/ticketing/dates";
import { useLoad, message, money } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";

export function EditorPage() {
  const { id } = useParams();
  return id ? <ExistingEditor id={id} /> : <EditorForm />;
}
function ExistingEditor({ id }: { id: string }) {
  const r = useLoad<Event>(`/organizer/events/${id}`);
  if (r.loading) return <Loading />;
  if (!r.data) return <Notice error={r.error} />;
  return <EditorForm event={r.data} reload={r.reload} />;
}
function EditorForm({
  event: e,
  reload = () => {},
}: {
  event?: Event;
  reload?: () => void;
}) {
  const categories = useLoad<Category[]>("/categories"),
    navigate = useNavigate(),
    [error, setError] = useState("");
  const command = async (path: string, body = {}) => {
    try {
      setError("");
      await api.post(`/organizer/events/${e?.id}/${path}`, body);
      reload();
    } catch (e) {
      setError(message(e));
    }
  };
  // Mount the form once its saved category has a matching select option.
  if (categories.loading) return <Loading />;
  if (categories.error) return <Notice error={categories.error} />;
  return (
    <>
      <Link className="back" to="/organizer">
        ← Sự kiện của bạn
      </Link>
      <PageHead
        eyebrow="THIẾT KẾ TRẢI NGHIỆM"
        title={e ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
        actions={e ? <Status value={e.status} /> : undefined}
      />
      <Notice error={error} />
      <div className="editor-grid">
        <section className="panel">
          <h2>Thông tin sự kiện</h2>
          <ActionForm
            label="Lưu bản nháp"
            onSubmit={async (d) => {
              const payload = {
                ...d,
                coverImageUrl: d.coverImageUrl || undefined,
                startsAt: eventTime(d.startsAt, e?.starts_at),
                endsAt: eventTime(d.endsAt, e?.ends_at),
                checkinOpensAt: eventTime(
                  d.checkinOpensAt,
                  e?.checkin_opens_at,
                ),
                checkinClosesAt: eventTime(
                  d.checkinClosesAt,
                  e?.checkin_closes_at,
                ),
              };
              const result = e
                ? await api.patch(`/organizer/events/${e.id}`, payload)
                : await api.post("/organizer/events", payload);
              if (!e) navigate(`/organizer/events/${result.data.data.id}`);
              else reload();
            }}
          >
            <Field label="Tên sự kiện" name="title" value={e?.title} />
            <div className="form-grid">
              <Field
                label="Đường dẫn (chữ thường, dấu gạch ngang)"
                name="slug"
                value={e?.slug}
              />
              <Field
                label="Danh mục"
                name="categoryId"
                value={e?.category_id}
                options={[
                  { value: "", label: "Chọn danh mục" },
                  ...(categories.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </div>
            <Field
              label="Giới thiệu sự kiện"
              name="description"
              type="textarea"
              value={e?.description}
            />
            <ImageField
              label="Ảnh bìa"
              name="coverImageUrl"
              value={e?.cover_image_url}
            />
            <div className="form-grid">
              <Field label="Địa điểm" name="venueName" value={e?.venue_name} />
              <Field label="Thành phố" name="cityCode" value={e?.city_code} />
            </div>
            <Field label="Địa chỉ" name="address" value={e?.address} />
            <div className="form-grid">
              <Field
                label="Bắt đầu"
                name="startsAt"
                type="datetime-local"
                value={local(e?.starts_at)}
              />
              <Field
                label="Kết thúc"
                name="endsAt"
                type="datetime-local"
                value={local(e?.ends_at)}
              />
              <Field
                label="Mở check-in"
                name="checkinOpensAt"
                type="datetime-local"
                value={local(e?.checkin_opens_at)}
              />
              <Field
                label="Đóng check-in"
                name="checkinClosesAt"
                type="datetime-local"
                value={local(e?.checkin_closes_at)}
              />
            </div>
          </ActionForm>
        </section>
        <aside>
          <section className="panel">
            <h2>Trạng thái & xét duyệt</h2>
            {e ? (
              <>
                <Status value={e.status} />
                <p className="muted">
                  Hoàn tất thông tin và loại vé trước khi gửi duyệt.
                </p>
                {["DRAFT", "REJECTED"].includes(e.status) && (
                  <button
                    className="btn primary full"
                    onClick={() => void command("submit")}
                  >
                    Gửi Admin phê duyệt
                  </button>
                )}
                {e.status === "PUBLISHED" && (
                  <>
                    <Link className="btn ghost full" to={`/events/${e.slug}`}>
                      Xem trang công khai
                    </Link>
                    <button
                      className="btn ghost full"
                      onClick={() =>
                        void command("pause", { paused: !e.sales_paused })
                      }
                    >
                      {e.sales_paused ? "Mở bán trở lại" : "Tạm ngừng bán"}
                    </button>
                  </>
                )}
                {e.reviews?.map((r, n) => (
                  <div className="notice" key={n}>
                    <Status value={r.decision} />
                    <p>{r.reason || "Sự kiện đã được duyệt."}</p>
                  </div>
                ))}
                {!["CANCELLED", "ARCHIVED"].includes(e.status) && (
                  <details>
                    <summary>Hủy sự kiện</summary>
                    <ActionForm
                      label="Hủy sự kiện chưa bán vé"
                      onSubmit={async (d) => {
                        await api.post(`/organizer/events/${e.id}/cancel`, d);
                        reload();
                      }}
                    >
                      <Field label="Lý do" name="reason" />
                    </ActionForm>
                  </details>
                )}
              </>
            ) : (
              <p>Lưu thông tin trước, sau đó thêm loại vé.</p>
            )}
          </section>
          {e && (
            <section className="panel section-gap">
              <h2>Loại vé</h2>
              {e.ticketTypes?.map((t) => (
                <div className="ticket-option" key={t.id}>
                  <div>
                    <strong>{t.name}</strong>
                    <p>
                      {money(t.price_amount)} · {t.capacity} chỗ
                    </p>
                    <small>
                      Đã bán {t.sold_quantity} · Đang giữ {t.reserved_quantity}
                    </small>
                  </div>
                  {["DRAFT", "REJECTED"].includes(e.status) &&
                    !t.archived_at && (
                      <div>
                        <details>
                          <summary>Chỉnh sửa</summary>
                          <ActionForm
                            label="Lưu loại vé"
                            onSubmit={async (d) => {
                              await api.patch(
                                `/organizer/events/${e.id}/ticket-types/${t.id}`,
                                {
                                  ...d,
                                  capacity: Number(d.capacity),
                                  saleStartsAt: iso(d.saleStartsAt),
                                  saleEndsAt: iso(d.saleEndsAt),
                                },
                              );
                              reload();
                            }}
                          >
                            <Field
                              label="Tên loại vé"
                              name="name"
                              value={t.name}
                            />
                            <Field
                              label="Giá (đ)"
                              name="price"
                              type="number"
                              value={t.price_amount}
                            />
                            <Field
                              label="Sức chứa"
                              name="capacity"
                              type="number"
                              value={t.capacity}
                            />
                            <Field
                              label="Mở bán"
                              name="saleStartsAt"
                              type="datetime-local"
                              value={local(t.sale_starts_at)}
                            />
                            <Field
                              label="Kết thúc bán"
                              name="saleEndsAt"
                              type="datetime-local"
                              value={local(t.sale_ends_at)}
                            />
                          </ActionForm>
                        </details>
                        <button
                          className="btn ghost"
                          onClick={async () => {
                            try {
                              await api.delete(
                                `/organizer/events/${e.id}/ticket-types/${t.id}`,
                              );
                              reload();
                            } catch (e) {
                              setError(message(e));
                            }
                          }}
                        >
                          Ngừng dùng
                        </button>
                      </div>
                    )}
                </div>
              ))}
              {["DRAFT", "REJECTED"].includes(e.status) && (
                <ActionForm
                  label="Thêm loại vé"
                  onSubmit={async (d) => {
                    await api.post(`/organizer/events/${e.id}/ticket-types`, {
                      ...d,
                      capacity: Number(d.capacity),
                      saleStartsAt: iso(d.saleStartsAt),
                      saleEndsAt: iso(d.saleEndsAt),
                    });
                    reload();
                  }}
                >
                  <Field label="Tên loại vé" name="name" />
                  <div className="form-grid">
                    <Field label="Giá vé (đ)" name="price" type="number" />
                    <Field label="Số lượng" name="capacity" type="number" />
                  </div>
                  <Field
                    label="Mở bán"
                    name="saleStartsAt"
                    type="datetime-local"
                    value={local(new Date().toISOString())}
                  />
                  <Field
                    label="Kết thúc bán"
                    name="saleEndsAt"
                    type="datetime-local"
                    value={local(e.starts_at)}
                  />
                </ActionForm>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
