import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { Save } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { get, message, useLoad } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import { OrganizerSidebar } from "./OrganizerSidebar";
import { OrganizerHeader } from "./OrganizerHeader";
import { EventFormFields, EventPreview } from "./EventFormSections";
import { EventReviewPanel } from "./EventReviewPanel";
import { MAX_BANNER_BYTES, type CreateEventForm } from "./create-event-data";
import { editEventForm, editEventPayload } from "./edit-event-data";
import "./create-event.css";
import "./edit-event.css";

const sections = [["ce-basic", "Thông tin chung"], ["ce-description", "Mô tả sự kiện"], ["ce-schedule", "Lịch trình & Địa điểm"], ["ce-banner", "Hình ảnh"]] as const;

export function EditorPage() {
  const { id = "" } = useParams();
  const userId = useAuth(s => s.user?.idUser);
  return <ExistingEditor key={`${userId}:${id}`} id={id} userId={userId} />;
}

function ExistingEditor({ id, userId }: { id: string; userId?: string }) {
  const result = useLoad<Event>(`/organizer/events/${encodeURIComponent(id)}`);
  if (result.loading || result.error || !result.data) return <div className="ce-page">
    <OrganizerSidebar active="Chỉnh sửa sự kiện" /><div className="ce-body"><OrganizerHeader title="Chỉnh sửa sự kiện" />
      <div className="ce-content">{result.loading ? <p role="status">Đang tải sự kiện…</p> : <div className="ce-error" role="alert">{result.error || "Không tìm thấy sự kiện."}<button onClick={result.reload}>Thử tải lại</button><Link to="/organizer">Về danh sách sự kiện</Link></div>}</div>
    </div>
  </div>;
  return <EventEditor initial={result.data} userId={userId} />;
}

function EventEditor({ initial, userId }: { initial: Event; userId?: string }) {
  const categories = useLoad<Category[]>("/categories");
  const [event, setEvent] = useState(initial);
  const [values, setValues] = useState(() => editEventForm(initial));
  const [activeSection, setActiveSection] = useState("ce-basic");
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false);
  const [error, setError] = useState(""), [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState(""), [outOfSync, setOutOfSync] = useState(false);
  const lock = useRef(false), alive = useRef(true);
  const alertBox = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(editEventForm(event));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const url = `/organizer/events/${encodeURIComponent(event.id)}`;
  const editable = !["PENDING_REVIEW", "CANCELLED", "ARCHIVED"].includes(event.status);
  const disabled = busy || uploading || !editable || outOfSync;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    (dirty || busy || uploading) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Rời trang và bỏ các thay đổi chưa lưu?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (error) alertBox.current?.focus(); }, [error]);
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current || lock.current) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const sameSession = () => alive.current && useAuth.getState().user?.idUser === userId;
  function update(name: keyof CreateEventForm, value: string) {
    if (disabled || lock.current) return;
    setValues(v => ({ ...v, [name]: value })); setError(""); setNotice("");
  }
  async function sync(resetForm: boolean) {
    const latest = await get<Event>(url);
    if (!sameSession()) return;
    setEvent(latest);
    if (resetForm) { setValues(editEventForm(latest)); dirtyRef.current = false; }
    setOutOfSync(false);
  }
  async function refresh() {
    if (lock.current) return;
    if (dirty && !window.confirm("Tải lại sẽ bỏ các thay đổi chưa lưu. Tiếp tục?")) return;
    lock.current = true; setBusy(true); setError("");
    try { await sync(true); } catch (failure) { if (sameSession()) setError(message(failure)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || lock.current || !dirty) return;
    setError(""); setNotice("");
    try {
      if (!categories.data?.some(c => c.id === values.categoryId)) throw new Error("Vui lòng chọn một danh mục đang khả dụng.");
      const payload = editEventPayload(values, event);
      if (event.status === "PUBLISHED" && !window.confirm("Lưu thay đổi sẽ đưa sự kiện về bản nháp và ngừng công khai cho tới khi được duyệt lại. Tiếp tục?")) return;
      lock.current = true; setBusy(true);
      const saved = (await api.patch<{ data: Event }>(url, payload)).data.data;
      if (!sameSession()) return;
      // PATCH returns the saved event without ticketTypes/reviews. Keep them until GET completes.
      setEvent({ ...event, ...saved }); setValues(editEventForm(saved)); dirtyRef.current = false;
      setNotice("Đã lưu thay đổi. Sự kiện ở bản nháp; gửi duyệt khi đã hoàn tất.");
      try { await sync(true); } catch { if (sameSession()) { setOutOfSync(true); setError("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu. Hãy tải lại trước khi tiếp tục."); } }
    } catch (failure) { if (sameSession()) setError(message(failure)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function command(action: "submit" | "pause" | "cancel", body: object = {}) {
    if (lock.current || uploading || busy || dirty || outOfSync || (action === "submit" && !editable)) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await api.post(`${url}/${action}`, body);
      if (!sameSession()) return;
      setNotice(action === "submit" ? "Đã gửi sự kiện cho Admin phê duyệt." : action === "cancel" ? "Đã hủy sự kiện." : "Đã cập nhật trạng thái bán vé.");
      // Prevent stale state actions until a fresh server snapshot has arrived.
      setOutOfSync(true);
      try { await sync(true); } catch { if (sameSession()) setError("Thao tác đã thành công nhưng chưa tải lại được dữ liệu. Hãy tải lại trước khi tiếp tục."); }
    } catch (failure) { if (sameSession()) setError(message(failure)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || disabled || lock.current) return;
    setUploadError("");
    if (file.size > MAX_BANNER_BYTES) { setUploadError("Ảnh tối đa 5 MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setUploadError("Vui lòng chọn ảnh JPG, PNG hoặc WEBP."); return; }
    lock.current = true; setUploading(true);
    try {
      const data = new FormData(); data.append("image", file);
      const uploaded = (await api.post<{ data: { url: string } }>("/media", data)).data.data.url;
      if (sameSession()) { setValues(v => ({ ...v, coverImageUrl: uploaded })); setNotice(""); }
    } catch (failure) { if (sameSession()) setUploadError(message(failure)); }
    finally { lock.current = false; if (alive.current) setUploading(false); }
  }
  return <div className="ce-page ee-page">
    <OrganizerSidebar active="Chỉnh sửa sự kiện" />
    <div className="ce-body"><OrganizerHeader title="Chỉnh sửa sự kiện" />
      <div className="ce-content">
        <nav className="ce-steps" aria-label="Các phần thông tin sự kiện">{sections.map(([id, label], index) => <a key={id} href={`#${id}`} className={activeSection === id ? "is-active" : ""} aria-current={activeSection === id ? "step" : undefined} onClick={() => setActiveSection(id)}><span className="ce-step-number">0{index + 1}</span><span><small>Thông tin sự kiện</small><strong>{index + 1}. {label}</strong></span></a>)}</nav>
        <div className="ce-heading"><div><span className="ce-kicker">SOẠN THẢO SỰ KIỆN</span><h1>Chỉnh sửa sự kiện</h1><p className="ee-event-title">{event.title}</p></div><span className="ce-draft-note" role="status"><Save size={15} />{busy ? "Đang xử lý…" : dirty ? "Có thay đổi chưa lưu" : "Thông tin đã lưu trên hệ thống"}</span></div>
        {notice && <p className="ee-notice" role="status">{notice}</p>}
        {error && <div className="ce-error" role="alert" ref={alertBox} tabIndex={-1}>{error}</div>}
        {outOfSync && <div className="ce-error"><button disabled={busy} onClick={() => void refresh()}>Tải lại dữ liệu sự kiện</button></div>}
        {!editable && <p className="ee-notice">Thông tin chỉ có thể xem ở trạng thái hiện tại.</p>}
        {event.status === "PUBLISHED" && <p className="ee-notice">Lưu thay đổi sẽ chuyển sự kiện về bản nháp và cần gửi duyệt lại. Khi đã có vé thanh toán, không thể đổi thời gian tổ chức hoặc địa điểm. Khi còn đơn giữ vé, chưa thể lưu thay đổi.</p>}
        <div className="ce-grid">
          <form className="ce-form" aria-label="Chỉnh sửa sự kiện" aria-busy={busy || uploading} onSubmit={e => void save(e)}>
            <EventFormFields values={values} update={update} categories={categories} disabled={disabled} uploading={uploading} uploadError={uploadError} upload={upload} setActiveSection={setActiveSection} slug={event.slug} />
            <div className="ce-actions ce-card"><p>Loại vé được quản lý tại trang riêng. Lưu thay đổi trước khi gửi duyệt.</p><div><Link className="ce-back" to="/organizer/events">Quay lại danh sách</Link><Link className="ce-button ce-secondary" to={`${url}/tickets`}>Quản lý loại vé</Link><button className="ce-button ce-primary" disabled={disabled || !dirty || categories.loading || !!categories.error}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button></div></div>
          </form>
          <EventPreview values={values} categoryName={categories.data?.find(c => c.id === values.categoryId)?.name} status={event.status}>
            <EventReviewPanel event={event} busy={busy || uploading || outOfSync} dirty={dirty} onCommand={command} />
          </EventPreview>
        </div>
      </div>
    </div>
  </div>;
}
