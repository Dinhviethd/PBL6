import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera } from "lucide-react";
import api from "../../lib/api";
import { ActionForm } from "./customer";
import { Notice, Field } from "./shared";
import { message, when } from "./data";
export function Scanner({ eventId }: { eventId: string }) {
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    [scanning, setScanning] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  const scan = useCallback(
    async (code: string) => {
      setError("");
      setResult("");
      try {
        const r = await api.post(`/checkin/events/${eventId}/checkins`, {
          code,
        });
        setResult(
          r.data.data.duplicate
            ? `Vé đã check-in lúc ${when(r.data.data.checked_in_at)}`
            : `Check-in thành công · ${when(r.data.data.checked_in_at)}`,
        );
      } catch (e) {
        setError(message(e));
      }
    },
    [eventId],
  );
  useEffect(() => {
    if (!scanning || !video.current) return;
    let disposed = false,
      handled = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(
        undefined,
        video.current,
        (value, _err, control) => {
          if (value && !handled) {
            handled = true;
            control.stop();
            setScanning(false);
            void scan(value.getText());
          }
        },
      )
      .then((c) => {
        if (disposed) c.stop();
        else controls.current = c;
      })
      .catch((e) => {
        if (!disposed) {
          setError(
            `Không mở được camera: ${message(e)}. Bạn có thể nhập mã vé bên dưới.`,
          );
          setScanning(false);
        }
      });
    return () => {
      disposed = true;
      controls.current?.stop();
    };
  }, [scanning, eventId, scan]);
  return (
    <div className="scanner-grid">
      <section className="panel">
        <div className="camera-preview">
          <video ref={video} muted playsInline />
          {!scanning && (
            <div>
              <Camera size={44} />
              <p>Quét mã QR trên vé điện tử</p>
            </div>
          )}
        </div>
        <button
          className="btn primary full"
          onClick={() => setScanning(!scanning)}
        >
          {scanning ? "Dừng camera" : "Bật camera quét QR"}
        </button>
        <small className="muted">
          Camera cần HTTPS hoặc localhost và quyền truy cập trình duyệt.
        </small>
      </section>
      <section className="panel">
        <h2>Kiểm tra vé</h2>
        <Notice error={error}>{result || null}</Notice>
        <ActionForm
          label="Kiểm tra & check-in"
          showSuccess={false}
          onSubmit={async (d) => {
            await scan(d.code);
          }}
        >
          <Field
            label="Mã vé / nội dung QR"
            name="code"
            placeholder="Nhập mã được hiển thị dưới QR"
          />
        </ActionForm>
        <p className="muted">
          Kết quả chỉ thành công khi máy chủ xác nhận. Vé sai sự kiện hoặc đã sử
          dụng sẽ không được ghi nhận lại.
        </p>
      </section>
    </div>
  );
}
