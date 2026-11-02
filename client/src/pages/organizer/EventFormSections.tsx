import { useRef, type ReactNode } from "react";
import { ArrowRight, CalendarDays, Eye, ImagePlus, Lightbulb, MapPin, Trash2, UploadCloud } from "lucide-react";
import type { Category } from "@/features/ticketing/types";
import type { useLoad } from "@/features/ticketing/data";
import { Status } from "@/components/ticketing/shared";
import { eventMapUrl, type CreateEventForm } from "./create-event-data";

type FieldsProps = {
  values: CreateEventForm;
  update: (name: keyof CreateEventForm, value: string) => void;
  categories: ReturnType<typeof useLoad<Category[]>>;
  disabled: boolean;
  uploading: boolean;
  uploadError: string;
  upload: (file?: File) => Promise<void>;
  setActiveSection: (id: string) => void;
  slug?: string;
};

export function EventFormFields({ values, update, categories, disabled, uploading, uploadError, upload, setActiveSection, slug }: FieldsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const mapUrl = eventMapUrl(values);
  const wordCount = values.description.trim().split(/\s+/).filter(Boolean).length;
  const input = (name: keyof CreateEventForm, label: string, type = "text", maxLength?: number, placeholder?: string) => (
    <label className="ce-field" key={name}>
      <span>{label} <b aria-hidden="true">*</b></span>
      <input name={name} type={type} value={values[name]} onChange={(event) => update(name, event.target.value)}
        required maxLength={maxLength} placeholder={placeholder} />
    </label>
  );
  return (
    <fieldset disabled={disabled}>
      <section id="ce-basic" className="ce-card" onFocus={() => setActiveSection("ce-basic")}>
        <div className="ce-section-title"><h2><span>#1</span>Thông tin cơ bản</h2><small>* Trường bắt buộc</small></div>
        {slug && <label className="ce-field"><span>Đường dẫn (tự động)</span><input value={slug} readOnly aria-label="Đường dẫn (tự động)" /></label>}
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
  );
}

export function EventPreview({ values, categoryName, status, children }: { values: CreateEventForm; categoryName?: string; status?: string; children?: ReactNode }) {
  return (
    <aside className="ce-preview" aria-label="Xem trước sự kiện">
    <div className="ce-card ce-preview-intro"><h2><Eye size={19} />Xem trước thời gian thực</h2><p>Thông tin cập nhật theo nội dung bạn nhập. Sự kiện chỉ công khai sau khi được phê duyệt.</p></div>
    <div className="ce-preview-card">
      <div className="ce-preview-image">{values.coverImageUrl ? <img src={values.coverImageUrl} alt="Ảnh bìa xem trước" /> : <div><ImagePlus size={38} /><span>Banner sự kiện của bạn</span></div>}<span className="ce-preview-category">{categoryName || "THỂ LOẠI"}</span><span className="ce-preview-status">{status ? <Status value={status} /> : "BẢN NHÁP"}</span></div>
      <div className="ce-preview-content"><h2>{values.title.trim() || "Tên sự kiện của bạn"}</h2>
        <p><CalendarDays size={19} /><span>{values.startsDate && values.startsTime ? `${values.startsTime} · ${values.startsDate.split("-").reverse().join("/")} (GMT+7)` : "Ngày và giờ tổ chức"}</span></p>
        <p><MapPin size={19} /><span>{values.venueName || "Tên địa điểm"}<small>{[values.address, values.cityCode].filter(Boolean).join(", ") || "Địa chỉ tổ chức sự kiện"}</small></span></p>
        <div className="ce-preview-description">{values.description || "Câu chuyện về sự kiện sẽ xuất hiện tại đây."}</div>
      </div><div className="ce-preview-footer">THÔNG TIN SỰ KIỆN <span>EVENT<span>HUB</span></span></div>
    </div>
    {children}
    <div className="ce-card ce-tips"><h2><Lightbulb size={20} />Gợi ý cho sự kiện</h2><p>• Dùng ảnh ngang rõ nét, thể hiện chủ đề sự kiện.</p><p>• Đặt tên dễ nhớ và mô tả những trải nghiệm dành cho người tham dự.</p></div>
    </aside>
  );
}
