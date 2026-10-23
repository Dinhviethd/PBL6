import { useState, type FormEvent, type ReactNode } from "react";
import { Notice } from "./shared";
import { message, values } from "@/features/ticketing/data";

export function ActionForm({
  onSubmit,
  children,
  label = "Lưu",
  className = "form",
  showSuccess = true,
}: {
  onSubmit: (d: Record<string, string>) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  className?: string;
  showSuccess?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = values(e);
    setBusy(true);
    setError("");
    setDone(false);
    try {
      await onSubmit(d);
      setDone(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={className} onSubmit={submit}>
      {children}
      <Notice error={error}>
        {done && showSuccess ? "Đã lưu thành công." : null}
      </Notice>
      <button className="btn primary" disabled={busy}>
        {busy ? "Đang xử lý…" : label}
      </button>
    </form>
  );
}
