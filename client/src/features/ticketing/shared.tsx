import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { message } from "./data";
export function Notice({
  error,
  children,
}: {
  error?: string;
  children?: ReactNode;
}) {
  return error ? (
    <div className="notice error" role="alert">
      {error}
    </div>
  ) : children ? (
    <div className="notice">{children}</div>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <span>◎</span>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      Đang tải dữ liệu…
    </div>
  );
}
const labels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  PUBLISHED: "Đã công khai",
  REJECTED: "Bị từ chối",
  PENDING: "Đang chờ",
  APPROVED: "Đã duyệt",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  VALID: "Chưa sử dụng",
  CHECKED_IN: "Đã check-in",
  VOID: "Vé đã hủy",
  SUCCEEDED: "Thành công",
  FAILED: "Thất bại",
  UNKNOWN: "Đang xác minh",
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
};
export function Status({ value }: { value: string }) {
  return (
    <span className={`status s-${value.toLowerCase()}`}>
      {labels[value] ?? value}
    </span>
  );
}
export function PageHead({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}) {
  const labelId = useId();
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {options ? (
        <select aria-labelledby={labelId} name={name} defaultValue={value} required={required}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
          placeholder={placeholder}
          min={type === "number" ? 0 : undefined}
        />
      )}
    </label>
  );
}
export function Pager({
  page,
  setPage,
  hasNext,
}: {
  page: number;
  setPage: (n: number) => void;
  hasNext: boolean;
}) {
  return (
    <div className="pager">
      <button
        className="btn ghost"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        ← Trước
      </button>
      <span>Trang {page + 1}</span>
      <button
        className="btn ghost"
        disabled={!hasNext}
        onClick={() => setPage(page + 1)}
      >
        Sau →
      </button>
    </div>
  );
}
export function Back() {
  return (
    <Link className="back" to="/">
      ← Khám phá sự kiện
    </Link>
  );
}
export function ImageField({
  name,
  label,
  value = "",
}: {
  name: string;
  label: string;
  value?: string;
}) {
  const [url, setUrl] = useState(value),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <span>{label}</span>
      {url && (
        <img
          src={url}
          alt="Ảnh đã chọn"
          style={{ maxHeight: 150, objectFit: "cover", borderRadius: 8 }}
        />
      )}
      <input
        aria-label={label}
        name={name}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Dán URL hoặc tải ảnh bên dưới"
      />
      <input
        aria-label={`Tải ${label.toLowerCase()}`}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            setError("Ảnh tối đa 5 MB.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            const form = new FormData();
            form.append("image", file);
            const r = await api.post("/media", form);
            setUrl(r.data.data.url);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && <small>Đang tải ảnh…</small>}
      <Notice error={error} />
    </div>
  );
}
