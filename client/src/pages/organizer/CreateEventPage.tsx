import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, Eye, ImagePlus, Info, Lightbulb, MapPin, Save, Trash2, UploadCloud } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { message, useLoad } from "@/features/ticketing/data";
import type { Category, Event } from "@/features/ticketing/types";
import { OrganizerSidebar } from "./OrganizerSidebar";
import { createEventPayload, draftKey, emptyEventForm, eventMapUrl, MAX_BANNER_BYTES, readEventDraft, type CreateEventForm } from "./create-event-data";
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
  const user = useAuth((s) => s.user);
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
  const fileInput = useRef<HTMLInputElement>(null);
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
  const mapUrl = eventMapUrl(values);
  const wordCount = values.description.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = Boolean(categories.data?.length) && !categories.loading && !categories.error && !disabled;
  const input = (name: keyof CreateEventForm, label: string, type = "text", maxLength?: number, placeholder?: string) => (
    <label className="ce-field" key={name}>
      <span>{label} <b aria-hidden="true">*</b></span>
      <input name={name} type={type} value={values[name]} onChange={(event) => update(name, event.target.value)}
        required maxLength={maxLength} placeholder={placeholder} />
    </label>
  );

  return (
    <div className="ce-page">
      <OrganizerSidebar active="Tạo sự kiện mới" />
      <div className="ce-body">
        <header className="ce-header">
          <nav aria-label="Đường dẫn" className="ce-breadcrumb">
            <Link to="/organizer"><ArrowLeft size={16} /> <span>Ban Tổ Chức</span></Link><span>/</span><span>Tạo sự kiện</span>
          </nav>
          <div className="ce-account">
            <Link to="/notifications" aria-label="Thông báo"><Bell size={20} /></Link>
            <Link to="/profile" className="ce-identity"><span className="ce-avatar">{user?.name.slice(0, 1).toUpperCase()}</span><span><strong>{user?.name}</strong><small>Ban Tổ Chức</small></span></Link>
          </div>
        </header>
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
                  <fieldset disabled={disabled}>
                    <section id="ce-basic" className="ce-card" onFocus={() => setActiveSection("ce-basic")}>
                      <div className="ce-section-title"><h2><span>#1</span>Thông tin cơ bản</h2><small>* Trường bắt buộc</small></div>
                      <div className="ce-title-field">{input("title", "Tên sự kiện", "text", 200, "Nhập tên sự kiện của bạn...")}<small>{values.title.length}/200</small></div>
                      <p className="ce-help">Tên sự kiện sẽ xuất hiện trên trang giới thiệu và thông tin vé.</p>
                      <label className="ce-field"><span>Thể loại sự kiện <b aria-hidden="true">*</b></span>
                        <select name="categoryId" value={values.categoryId} onChange={(e) => update("categoryId", e.target.value)} required disabled={categories.loading || Boolean(categories.error) || !categories.data?.length}>
                          <option value="">{categories.loading ? "Đang tải danh mục…" : "Chọn thể loại sự kiện"}</option>
                          {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                      </label>
                      {categories.error ? <div className="ce-error" role="alert">{categories.error}<button type="button" onClick={categories.reload}>Thử tải lại danh mục</button></div>
                        : !categories.loading && !categories.data?.length ? <div className="ce-error" role="status">Chưa có danh mục khả dụng.<button type="button" onClick={categories.reload}>Thử tải lại danh mục</button></div>
                        : <p className="ce-help">Chọn thể loại giúp người tham dự tìm thấy sự kiện phù hợp.</p>}
                    </section>
                    <section id="ce-description" className="ce-card" onFocus={() => setActiveSection("ce-description")}>
                      <div className="ce-section-title"><h2><span>#2</span>Mô tả sự kiện chi tiết</h2></div>
                      <div className="ce-editor-meta"><span>Văn bản thuần · Giữ xuống dòng</span><span>{wordCount} từ</span></div>
                      <label className="ce-field"><span className="ce-sr-only">Giới thiệu sự kiện</span>
                        <textarea name="description" required maxLength={20000} rows={9} value={values.description} onChange={(e) => update("description", e.target.value)} placeholder="Viết câu chuyện khơi gợi đam mê của người tham dự…" />
                      </label><p className="ce-counter">{values.description.length.toLocaleString("vi-VN")}/20.000 ký tự</p>
                    </section>
                    <section id="ce-schedule" className="ce-card" onFocus={() => setActiveSection("ce-schedule")}>
                      <div className="ce-section-title"><h2><span>#3</span>Thời gian & Địa điểm tổ chức</h2><small>Múi giờ: GMT+7</small></div>
                      <div className="ce-dates">{input("startsDate", "Ngày bắt đầu", "date")}{input("startsTime", "Giờ bắt đầu", "time")}{input("endsDate", "Ngày kết thúc", "date")}{input("endsTime", "Giờ kết thúc", "time")}</div>
                      <div className="ce-two-fields">{input("checkinOpensAt", "Mở check-in", "datetime-local")}{input("checkinClosesAt", "Đóng check-in", "datetime-local")}</div>
                      <p className="ce-help">Thời gian check-in phải kết thúc trước hoặc cùng lúc sự kiện kết thúc.</p>
                      {input("venueName", "Tên địa điểm", "text", 200, "Ví dụ: Trung tâm hội nghị…")}
                      {input("address", "Địa chỉ chi tiết", "text", 1000, "Số nhà, tên đường, quận/huyện…")}
                      {input("cityCode", "Thành phố", "text", 32, "Ví dụ: Đà Nẵng")}
                      <div className="ce-map"><MapPin size={28} /><div><strong>Tìm địa điểm trên bản đồ</strong><p>{values.address.trim() || "Nhập địa chỉ để mở tìm kiếm trên Google Maps."}</p></div>
                        {mapUrl ? <a className="ce-button ce-secondary" href={mapUrl} target="_blank" rel="noopener noreferrer">Mở bản đồ <ArrowRight size={16} /></a> : <button className="ce-button ce-secondary" type="button" disabled>Mở bản đồ</button>}
                      </div>
                    </section>
                    <section id="ce-banner" className="ce-card" onFocus={() => setActiveSection("ce-banner")}>
                      <div className="ce-section-title"><h2><span>#4</span>Tải lên banner sự kiện</h2></div>
                      <div className="ce-upload-heading"><strong>Banner quảng bá ngang (Tỷ lệ 16:9)</strong><small>JPG, PNG, WEBP · Tối đa 5 MB</small></div>
                      <div className={`ce-upload${values.coverImageUrl ? " has-image" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files[0]); }}>
                        {values.coverImageUrl ? <img src={values.coverImageUrl} alt="Banner sự kiện đã tải lên" /> : <div className="ce-upload-placeholder"><UploadCloud size={38} /><strong>Kéo thả ảnh vào đây</strong><span>hoặc chọn ảnh từ thiết bị</span></div>}
                        <div className="ce-upload-actions"><button type="button" className="ce-button ce-secondary" onClick={() => fileInput.current?.click()}><ImagePlus size={17} />{uploading ? "Đang tải ảnh…" : values.coverImageUrl ? "Thay ảnh" : "Chọn banner"}</button>
                          {values.coverImageUrl && <button type="button" className="ce-button ce-secondary" onClick={() => update("coverImageUrl", "")}><Trash2 size={16} />Bỏ ảnh</button>}
                        </div>
                      </div>
                      <input className="ce-sr-only" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Tải banner" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
                      {uploadError && <p className="ce-error" role="alert">{uploadError}</p>}
                      {uploading && <p role="status">Đang tải banner, vui lòng chờ…</p>}
                      <p className="ce-help">Ảnh bìa hiển thị trên trang giới thiệu sự kiện. Bạn có thể bổ sung sau.</p>
                    </section>
                  </fieldset>
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
                <aside className="ce-preview" aria-label="Xem trước sự kiện">
                  <div className="ce-card ce-preview-intro"><h2><Eye size={19} />Xem trước thời gian thực</h2><p>Thông tin cập nhật theo nội dung bạn nhập. Sự kiện chỉ công khai sau khi được phê duyệt.</p></div>
                  <div className="ce-preview-card">
                    <div className="ce-preview-image">{values.coverImageUrl ? <img src={values.coverImageUrl} alt="Ảnh bìa xem trước" /> : <div><ImagePlus size={38} /><span>Banner sự kiện của bạn</span></div>}<span className="ce-preview-category">{categoryName || "THỂ LOẠI"}</span><span className="ce-preview-status">BẢN NHÁP</span></div>
                    <div className="ce-preview-content"><h2>{values.title.trim() || "Tên sự kiện của bạn"}</h2>
                      <p><CalendarDays size={19} /><span>{values.startsDate && values.startsTime ? `${values.startsTime} · ${values.startsDate.split("-").reverse().join("/")} (GMT+7)` : "Ngày và giờ tổ chức"}</span></p>
                      <p><MapPin size={19} /><span>{values.venueName || "Tên địa điểm"}<small>{[values.address, values.cityCode].filter(Boolean).join(", ") || "Địa chỉ tổ chức sự kiện"}</small></span></p>
                      <div className="ce-preview-description">{values.description || "Câu chuyện về sự kiện sẽ xuất hiện tại đây."}</div>
                    </div><div className="ce-preview-footer">THÔNG TIN SỰ KIỆN <span>EVENT<span>HUB</span></span></div>
                  </div>
                  <div className="ce-card ce-tips"><h2><Lightbulb size={20} />Gợi ý cho sự kiện</h2><p>• Dùng ảnh ngang rõ nét, thể hiện chủ đề sự kiện.</p><p>• Đặt tên dễ nhớ và mô tả những trải nghiệm dành cho người tham dự.</p></div>
                </aside>
              </div>

        </div>
      </div>
    </div>
  );
}
