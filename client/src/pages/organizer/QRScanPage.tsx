import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock,
  Keyboard,
  LoaderCircle,
  Menu,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/api";
import { message, useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { NotificationLink } from "@/components/ticketing/notification-link";
import { OrganizerSidebar } from "./OrganizerSidebar";
import "./qr-scan.css";

type CheckinEvent = {
  id: string;
  title: string;
  venue_name: string;
  checkin_opens_at: string;
  checkin_closes_at: string;
};
type ScanResponse = {
  duplicate: boolean;
  ticket_id: string;
  checked_in_at: string;
  ticket_code: string;
  buyer_name: string;
  ticket_type_name: string;
};
type Result =
  | { kind: "idle" | "pending" }
  | { kind: "success" | "duplicate"; data: ScanResponse }
  | { kind: "error"; title: string; message: string };

const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));

export function QRScanPage() {
  const { id = "" } = useParams();
  const userId = useAuth((state) => state.user?.idUser);
  return <ScanStation key={`${userId}:${id}`} eventId={id} />;
}

function ScanStation({ eventId }: { eventId: string }) {
  const user = useAuth((state) => state.user);
  const event = useLoad<CheckinEvent>(`/checkin/events/${eventId}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [cameraError, setCameraError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    const stop = () => {
      generation.current++;
      controls.current?.stop();
      controls.current = null;
      const stream = video.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setCamera("off");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted.current = false;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const disabled =
    event.loading ||
    Boolean(event.error) ||
    !event.data ||
    result.kind === "pending";
  function stopCamera() {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    setCamera("off");
  }
  async function scan(value: string) {
    if (locked.current || disabled || !value.trim()) return;
    locked.current = true;
    stopCamera();
    setCameraError("");
    setResult({ kind: "pending" });
    try {
      const response = await api.post<{ data: ScanResponse }>(
        `/checkin/events/${eventId}/checkins`,
        { code: value.trim() },
      );
      if (!mounted.current) return;
      setResult({
        kind: response.data.data.duplicate ? "duplicate" : "success",
        data: response.data.data,
      });
      setCode("");
    } catch (failure) {
      if (!mounted.current) return;
      const errorCode = axios.isAxiosError(failure)
        ? failure.response?.data?.code
        : "";
      const titles: Record<string, string> = {
        CHECKIN_CLOSED: "Chưa mở hoặc đã đóng check-in",
        INVALID_QR: "Mã vé không hợp lệ",
        VOID_TICKET: "Vé đã bị hủy",
        UNPAID_TICKET: "Vé chưa thanh toán",
        FORBIDDEN: "Không có quyền check-in",
      };
      setResult({
        kind: "error",
        title: titles[errorCode] || "Chưa xác nhận được kết quả",
        message: message(failure),
      });
    } finally {
      locked.current = false;
    }
  }
  async function startCamera() {
    if (disabled || camera !== "off" || !video.current) return;
    setCamera("starting");
    setCameraError("");
    setResult({ kind: "idle" });
    const request = ++generation.current;
    let handled = false;
    try {
      const reader = new BrowserQRCodeReader();
      const control = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video.current,
        (value, _error, control) => {
          if (
            !mounted.current ||
            generation.current !== request ||
            handled ||
            !value
          )
            return;
          handled = true;
          control.stop();
          void scan(value.getText());
        },
      );
      if (!mounted.current || generation.current !== request || handled)
        control.stop();
      else {
        controls.current = control;
        setCamera("on");
      }
    } catch {
      if (mounted.current && generation.current === request) {
        setCamera("off");
        setCameraError(
          "Không mở được camera. Kiểm tra quyền truy cập hoặc nhập mã vé bên dưới.",
        );
      }
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void scan(code);
  }
  const data = "data" in result ? result.data : null;
  const title =
    result.kind === "success"
      ? "Vé hợp lệ"
      : result.kind === "duplicate"
        ? "Vé đã sử dụng"
        : result.kind === "error"
          ? result.title
          : result.kind === "pending"
            ? "Đang xác thực vé"
            : "Sẵn sàng kiểm tra vé";
  return (
    <div className={`qs-page${menuOpen ? " qs-menu-open" : ""}`}>
      <div className="qs-sidebar" id="qr-navigation">
        <OrganizerSidebar active="Quét mã QR" hideLiveSync />
      </div>
      {menuOpen && (
        <button
          className="qs-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="qs-body">
        <header className="qs-header">
          <button
            className="qs-menu-button qs-icon-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="qr-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav aria-label="Đường dẫn">
            <Link to="/organizer">EventHub Ops</Link>
            <span>/</span>
            <span>Ban Tổ Chức</span>
          </nav>
          <div className="qs-account">
            <Link className="qs-button qs-create" to="/organizer/new">
              <Plus size={16} />
              Tạo sự kiện
            </Link>
            <NotificationLink />
            <Link to="/profile" className="qs-user">
              <span>{user?.name.slice(0, 1)}</span>
              <strong>{user?.name}</strong>
            </Link>
          </div>
        </header>
        <div className="qs-content">
          <section className="qs-hero">
            <div>
              <span className="qs-eyebrow">
                <ScanLine size={15} /> KIỂM SOÁT VÉ
              </span>
              <h1>
                Trạm Quét Mã QR
                <br />
                Check-In Trực Tiếp
              </h1>
              <p>Quét mã QR hoặc nhập mã vé để xác nhận người tham dự.</p>
            </div>
            <div className="qs-event">
              <Ticket size={21} />
              <div>
                <small>SỰ KIỆN ĐANG CHECK-IN</small>
                <strong>{event.data?.title || "Đang tải sự kiện…"}</strong>
                {event.data && (
                  <>
                    <span>{event.data.venue_name}</span>
                    <span>
                      {time(event.data.checkin_opens_at)} –{" "}
                      {time(event.data.checkin_closes_at)} (GMT+7)
                    </span>
                  </>
                )}
                <Link to="/organizer">Chọn sự kiện khác →</Link>
              </div>
            </div>
          </section>
          {event.error && (
            <div role="alert" className="qs-load-error">
              {event.error}
              <button className="qs-button" onClick={event.reload}>
                Thử tải lại
              </button>
            </div>
          )}
          {event.loading && <p role="status">Đang tải thông tin sự kiện…</p>}
          <div className="qs-grid">
            <div className="qs-left">
              <section className="qs-camera-card" aria-label="Camera quét QR">
                <div className="qs-camera-status">
                  <span className={camera === "on" ? "is-on" : ""} />
                  {camera === "on"
                    ? "CAMERA ĐANG QUÉT"
                    : camera === "starting"
                      ? "ĐANG MỞ CAMERA"
                      : "CAMERA ĐANG TẮT"}
                </div>
                <div
                  className={`qs-viewport${camera === "on" ? " is-scanning" : ""}`}
                >
                  <video
                    ref={video}
                    muted
                    playsInline
                    aria-label="Hình ảnh camera quét vé"
                  />
                  {camera !== "on" && (
                    <div className="qs-camera-placeholder">
                      {camera === "starting" ? (
                        <LoaderCircle className="qs-spin" size={64} />
                      ) : (
                        <QrCode size={120} strokeWidth={1.2} />
                      )}
                      <p>Đưa mã QR vào trung tâm</p>
                    </div>
                  )}
                  <i className="qs-corner qs-tl" />
                  <i className="qs-corner qs-tr" />
                  <i className="qs-corner qs-bl" />
                  <i className="qs-corner qs-br" />
                  {camera === "on" && <div className="qs-laser" />}
                </div>
                <button
                  className="qs-button"
                  disabled={disabled}
                  onClick={() =>
                    camera === "off" ? void startCamera() : stopCamera()
                  }
                >
                  <Camera size={18} />
                  {camera === "off" ? "Bật camera quét QR" : "Dừng camera"}
                </button>
                <p className="qs-camera-help">
                  Cho phép truy cập camera để quét vé.
                </p>
                {cameraError && (
                  <p role="alert" className="qs-camera-error">
                    {cameraError}
                  </p>
                )}
              </section>
              <section className="qs-manual">
                <h2>
                  <Keyboard size={20} />
                  Nhập mã vé thủ công
                </h2>
                <p>Dành cho mã QR bị mờ hoặc không dùng được camera.</p>
                <form onSubmit={submit}>
                  <label className="qs-code-label">
                    <span>Mã vé / nội dung QR</span>
                    <input
                      ref={input}
                      aria-label="Mã vé / nội dung QR"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={256}
                      required
                      disabled={disabled}
                      autoComplete="off"
                      placeholder="Nhập mã vé"
                    />
                  </label>
                  <button
                    className="qs-button"
                    disabled={disabled || !code.trim()}
                  >
                    <ShieldCheck size={18} />
                    Xác thực ngay
                  </button>
                </form>
              </section>
            </div>
            <section
              className={`qs-result qs-result-${result.kind}`}
              aria-label="Kết quả quét"
              aria-live="polite"
              aria-busy={result.kind === "pending"}
            >
              <div className="qs-result-heading">
                {result.kind === "pending" ? (
                  <LoaderCircle className="qs-spin" />
                ) : result.kind === "success" ? (
                  <CheckCircle2 />
                ) : result.kind === "error" || result.kind === "duplicate" ? (
                  <CircleAlert />
                ) : (
                  <ScanLine />
                )}
                <div>
                  <h2>{title}</h2>
                  <span>
                    {result.kind === "success"
                      ? "CHECK-IN THÀNH CÔNG"
                      : result.kind === "duplicate"
                        ? "KHÔNG GHI NHẬN LẠI"
                        : "KẾT QUẢ XÁC THỰC VÉ"}
                  </span>
                </div>
              </div>
              {data ? (
                <>
                  <div className="qs-ticket-details">
                    <small>HỌ VÀ TÊN KHÁCH</small>
                    <h3>{data.buyer_name || "Chưa có thông tin khách"}</h3>
                    <div className="qs-tier">
                      <Ticket />
                      <div>
                        <small>HẠNG VÉ PHÁT HÀNH</small>
                        <strong>
                          {data.ticket_type_name || "Chưa có thông tin hạng vé"}
                        </strong>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>Mã vé</dt>
                        <dd>{data.ticket_code || data.ticket_id}</dd>
                      </div>
                      <div>
                        <dt>Thời điểm check-in (GMT+7)</dt>
                        <dd>{time(data.checked_in_at)}</dd>
                      </div>
                    </dl>
                  </div>
                  <p className="qs-result-note">
                    <Clock size={16} />
                    {result.kind === "duplicate"
                      ? "Vé đã được sử dụng trước đó."
                      : "Máy chủ đã ghi nhận lượt check-in này."}
                  </p>
                </>
              ) : (
                <div className="qs-result-empty">
                  <ScanLine size={60} />
                  <p>
                    {result.kind === "error"
                      ? result.message
                      : result.kind === "pending"
                        ? "Đang chờ phản hồi từ máy chủ…"
                        : "Thông tin vé sẽ xuất hiện sau khi quét mã QR hoặc nhập mã vé."}
                  </p>
                  {result.kind === "error" && (
                    <p>
                      Kiểm tra kết nối và thử lại. Nếu yêu cầu trước đã được ghi
                      nhận, hệ thống sẽ báo vé đã sử dụng.
                    </p>
                  )}
                </div>
              )}
              {result.kind !== "idle" && result.kind !== "pending" && (
                <button
                  className="qs-next"
                  onClick={() => {
                    setResult({ kind: "idle" });
                    setCode("");
                    input.current?.focus();
                  }}
                >
                  Kiểm tra vé tiếp theo →
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
