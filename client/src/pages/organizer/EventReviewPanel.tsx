import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Status } from "@/components/ticketing/shared";
import type { Event } from "@/features/ticketing/types";

export function EventReviewPanel({ event, busy, dirty, onCommand }: {
  event: Event;
  busy: boolean;
  dirty: boolean;
  onCommand: (command: "submit" | "pause" | "cancel", body?: object) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const canSubmit = ["DRAFT", "REJECTED"].includes(event.status);
  const hasTickets = event.ticketTypes?.some(t => !t.archived_at);
  return <section className="ce-card ee-review" aria-label="Trạng thái & xét duyệt">
    <h2><ShieldCheck size={20} />Trạng thái &amp; xét duyệt</h2>
    <Status value={event.status} />
    {canSubmit && <>
      <p>Hoàn tất thông tin và ít nhất một loại vé trước khi gửi Admin phê duyệt.</p>
      {!hasTickets && <p>Cần thêm loại vé tại trang Quản lý loại vé.</p>}
      {dirty && <p role="status">Lưu thay đổi trước khi gửi duyệt.</p>}
      <button className="ce-button ce-primary" disabled={busy || dirty || !hasTickets} onClick={() => {
        if (window.confirm("Gửi thông tin và các loại vé đã lưu cho Admin phê duyệt?")) void onCommand("submit");
      }}>Gửi Admin phê duyệt</button>
    </>}
    {event.status === "PENDING_REVIEW" && <p>Sự kiện đang chờ Admin xét duyệt. Thông tin và loại vé được khóa chỉnh sửa.</p>}
    {event.status === "PUBLISHED" && <>
      <p>{event.sales_paused ? "Sự kiện đang tạm ngừng bán vé." : "Sự kiện đã công khai."}</p>
      <Link className="ce-button ce-secondary" to={`/events/${event.slug}`}>Xem trang công khai</Link>
      <button className="ce-button ce-secondary" disabled={busy || dirty} onClick={() => void onCommand("pause", { paused: !event.sales_paused })}>
        {event.sales_paused ? "Mở bán trở lại" : "Tạm ngừng bán"}
      </button>
    </>}
    {["CANCELLED", "ARCHIVED"].includes(event.status) && <p>Sự kiện đã đóng. Thông tin chỉ có thể xem.</p>}
    <Link className="ce-button ce-secondary" to={`/organizer/events/${event.id}/tickets`}>Quản lý loại vé</Link>
    <div className="ee-reviews"><h3>Lịch sử xét duyệt</h3>
      {!event.reviews?.length && <p>Chưa có kết quả xét duyệt.</p>}
      {event.reviews?.map((review, index) => <article key={`${review.created_at}:${index}`}>
        <Status value={review.decision} />
        <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (GMT+7)</time>
        <p>{review.reason || (review.decision === "APPROVED" ? "Sự kiện đã được duyệt." : "Không có lý do được cung cấp.")}</p>
      </article>)}
    </div>
    {!["CANCELLED", "ARCHIVED"].includes(event.status) && <details className="ee-cancel">
      <summary>Hủy sự kiện</summary>
      <p>Chỉ hủy khi chưa có vé thanh toán và không còn giao dịch cần xử lý. Máy chủ sẽ kiểm tra trước khi hủy.</p>
      <form onSubmit={e => {
        e.preventDefault();
        if (reason.trim() && window.confirm("Hủy sự kiện này? Thao tác này không thể hoàn tác.")) void onCommand("cancel", { reason: reason.trim() });
      }}>
        <label className="ce-field"><span>Lý do hủy</span><textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy || dirty} /></label>
        <button className="ce-button ce-secondary" disabled={busy || dirty || !reason.trim()}>Xác nhận hủy sự kiện</button>
      </form>
    </details>}
  </section>;
}
