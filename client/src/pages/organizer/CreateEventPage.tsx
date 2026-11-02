import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Info, Save } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { message, useLoad } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import { OrganizerSidebar } from "./OrganizerSidebar";
import { OrganizerHeader } from "./OrganizerHeader";
import { createEventPayload, draftKey, emptyEventForm, MAX_BANNER_BYTES, readEventDraft, type CreateEventForm } from "./create-event-data";
import { EventFormFields, EventPreview } from "./EventFormSections";
import "./create-event.css";

const sections = [
  ["ce-basic", "Thông tin chung"], ["ce-description", "Mô tả sự kiện"],
  ["ce-schedule", "Lịch trình & Địa điểm"], ["ce-banner", "Hình ảnh"],
] as const;

export function CreateEventPage() {
  const user = useAuth((s) => s.user);
  return user ? <CreateEventFormPage key={user.idUser} userId={user.idUser} /> : null;
}

function CreateEventFormPage({ userId }: { userId: string }) {
  const categories = useLoad<Category[]>("/categories");
  const storageKey = draftKey(userId);
  const [initial] = useState(() => readEventDraft(storageKey));
  const [values, setValues] = useState(initial.values);
  const [draftNote, setDraftNote] = useState(initial.restored ? "Đã khôi phục bản nháp trên thiết bị này." : "Bản nháp tự lưu trên thiết bị này.");
  const [storageError, setStorageError] = useState(initial.error);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Event | null>(null);
  const [activeSection, setActiveSection] = useState("ce-basic");
  const [confirmClear, setConfirmClear] = useState(false);
  const submitLock = useRef(false);
  const uploadLock = useRef(false);
  const errorBox = useRef<HTMLDivElement>(null);
  const successBox = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  useEffect(() => { if (created) successBox.current?.focus({ preventScroll: true }); }, [created]);

  function saveLocal(next: CreateEventForm) {
    if (created) return;
    try {
      const savedAt = new Date();
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, values: next, savedAt: savedAt.toISOString() }));
      setStorageError("");
      setDraftNote(`Đã lưu trên thiết bị lúc ${savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`);
    } catch {
      setStorageError("Không thể lưu nháp trên thiết bị. Hãy lưu sự kiện trước khi rời trang.");
    }
  }
  function update(field: keyof CreateEventForm, value: string) {
    if (created || submitLock.current) return;
    const next = { ...values, [field]: value };
    setValues(next);
    setError("");
    saveLocal(next);
  }
  function clearDraft() {
    if (created || submitLock.current || uploadLock.current) return;
    try {
      localStorage.removeItem(storageKey);
      setStorageError("");
      setValues({ ...emptyEventForm });
      setDraftNote("Đã xóa bản nháp trên thiết bị.");
      setConfirmClear(false);
      setError("");
      setUploadError("");
    } catch { setStorageError("Không thể xóa bản nháp trên thiết bị. Vui lòng thử lại."); }
  }
  async function upload(file?: File) {
    if (!file || created || uploadLock.current || submitLock.current) return;
    setUploadError("");
    if (file.size > MAX_BANNER_BYTES) { setUploadError("Ảnh tối đa 5 MB. Vui lòng chọn ảnh nhỏ hơn."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Vui lòng chọn ảnh JPG, PNG hoặc WEBP."); return;
    }
    uploadLock.current = true;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await api.post<{ data: { url: string } }>("/media", body);
      if (mounted.current && useAuth.getState().user?.idUser === userId) {
        // Inputs are disabled during upload, so the snapshot cannot lose newer edits.
        update("coverImageUrl", response.data.data.url);
      }
    } catch (failure) { if (mounted.current) setUploadError(message(failure)); }
    finally { uploadLock.current = false; if (mounted.current) setUploading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || uploadLock.current || created) return;
    setError("");
    submitLock.current = true;
    setBusy(true);
    try {
      if (!categories.data?.some((c) => c.id === values.categoryId)) throw new Error("Vui lòng chọn một danh mục đang khả dụng.");
      const payload = createEventPayload(values);
      const response = await api.post<{ data: Event }>("/organizer/events", payload);
      if (!mounted.current) return;
      if (!response.data.data?.id) throw new Error("Máy chủ chưa trả về mã sự kiện. Vui lòng kiểm tra danh sách sự kiện trước khi thử lại.");
      if (response.data.data.status !== 'DRAFT') throw new Error('Trạng thái sự kiện chưa được xác nhận là bản nháp. Vui lòng kiểm tra danh sách sự kiện.');
      setCreated(response.data.data);
      setDraftNote('Bản nháp đã được lưu trên hệ thống.');
      setConfirmClear(false);
      try { localStorage.removeItem(storageKey); setStorageError(""); }
      catch { setStorageError("Sự kiện đã được tạo, nhưng chưa xóa được bản nháp trên thiết bị."); }
    } catch (failure) { if (mounted.current) setError(message(failure)); }
    finally { submitLock.current = false; if (mounted.current) setBusy(false); }
  }

  const disabled = busy || uploading || Boolean(created);
  const categoryName = categories.data?.find((c) => c.id === values.categoryId)?.name;
  const canSubmit = Boolean(categories.data?.length) && !categories.loading && !categories.error && !disabled;

  return (
    <div className="ce-page">
      <OrganizerSidebar active="Tạo sự kiện mới" />
      <div className="ce-body">
        <OrganizerHeader title="Tạo sự kiện" />
        <div className="ce-content">
              <nav className="ce-steps" aria-label="Các phần thông tin sự kiện">
                {sections.map(([id, label], index) => <a key={id} href={`#${id}`} className={activeSection === id ? "is-active" : ""} aria-current={activeSection === id ? "step" : undefined} onClick={() => setActiveSection(id)}>
                  <span className="ce-step-number">0{index + 1}</span><span><small>{activeSection === id ? "Đang soạn thảo" : "Thông tin sự kiện"}</small><strong>{index + 1}. {label}</strong></span>
                </a>)}
              </nav>
              <div className="ce-heading">
                <div><span className="ce-kicker">SOẠN THẢO SỰ KIỆN</span><h1>Khởi tạo sự kiện của bạn</h1></div>
                <span className="ce-draft-note" role="status"><Save size={15} />{draftNote}</span>
              </div>
              {storageError && <p className="ce-error" role="alert">{storageError}</p>}
              <div className="ce-grid">
                <form className="ce-form" onSubmit={(e) => void submit(e)} aria-label="Tạo sự kiện" aria-busy={busy || uploading}>
                  <EventFormFields values={values} update={update} categories={categories} disabled={disabled}
                    uploading={uploading} uploadError={uploadError} upload={upload} setActiveSection={setActiveSection} />
                  {error && <div className="ce-error" role="alert" tabIndex={-1} ref={errorBox}>{error}</div>}
                  <div className="ce-actions ce-card"><p><Info size={18} />Lưu thông tin sự kiện trước. Loại vé được quản lý riêng.</p><div>
                    <Link to="/organizer" className="ce-back">Quay lại</Link>
                    <button type="button" className="ce-button ce-secondary" disabled={disabled} onClick={() => saveLocal(values)}><Save size={16} />Lưu nháp trên thiết bị</button>
                    <div className="ce-create-action">
                      <button type="submit" className="ce-button ce-primary" disabled={!canSubmit}>{busy ? "Đang tạo…" : created ? "Đã tạo bản nháp" : "Tạo sự kiện"}<ArrowRight size={18} /></button>
                      {created && <div className="ce-inline-success" ref={successBox} tabIndex={-1}>
                        <p role="status" aria-live="polite"><CheckCircle2 size={18} />Tạo bản nháp thành công</p>
                        <Link className="ce-button ce-primary" to={`/organizer/events/${created.id}/tickets`}>Tạo loại vé <ArrowRight size={18} /></Link>
                      </div>}
                    </div>
                  </div></div>
                  <div className="ce-clear">
                    {confirmClear ? <><span>Xóa thông tin đã nhập trên thiết bị?</span><button type="button" disabled={disabled} onClick={clearDraft}>Xóa bản nháp</button><button type="button" onClick={() => setConfirmClear(false)}>Giữ lại</button></> : <button type="button" disabled={disabled} onClick={() => setConfirmClear(true)}>Xóa bản nháp trên thiết bị</button>}
                  </div>
                </form>
                <EventPreview values={values} categoryName={categoryName} />
              </div>

        </div>
      </div>
    </div>
  );
}
