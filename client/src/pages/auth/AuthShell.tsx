import {
  Headset,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
export { AuthFooter } from "./AuthFooter";
export { AuthHeader } from "./AuthHeader";
export type { AuthMode } from "./AuthHeader";

export type AuthRole = "attendee" | "organizer";

const HOTLINE = "0378531013";
const SUPPORT_EMAIL = "trankhahao7@gmail.com";

export function AuthBackground() {
  return (
    <div className="auth-bg" aria-hidden="true">
      <span className="auth-glow auth-glow-primary" />
      <span className="auth-glow auth-glow-secondary" />
      <span className="auth-glow auth-glow-tertiary" />
      <span className="auth-bg-word auth-bg-word-left">
        NEBULA
        <small> TICKET DISRUPTION 2026</small>
      </span>
      <span className="auth-bg-word auth-bg-word-right">
        CYBER_BEAT
        <small>STREET CODE [{HOTLINE}]</small>
      </span>
    </div>
  );
}

export function AuthSupport() {
  return (
    <div className="auth-support" aria-label="Hỗ trợ kỹ thuật 24/7">
      <div className="auth-support-main">
        <span className="auth-support-icon">
          <Headset size={18} />
        </span>
        <div>
          <span className="auth-support-title">Hỗ trợ kỹ thuật 24/7</span>
          <span className="auth-support-hotline">
            Hotline:{" "}
            <a href={`tel:${HOTLINE}`}>{HOTLINE}</a>
          </span>
        </div>
      </div>
      <a className="auth-support-email" href={`mailto:${SUPPORT_EMAIL}`}>
        <Mail size={14} /> {SUPPORT_EMAIL}
      </a>
    </div>
  );
}

export function AuthToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="auth-toast" role="status" aria-live="polite">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" aria-label="Đóng thông báo" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}
