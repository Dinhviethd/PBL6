import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../lib/api";
import { errorMessage } from "../lib/data";
import {
  normalizedEmail,
  passwordIssue,
  safeNext,
  validEmail,
} from "../lib/account-validation";
import { PasswordField } from "../components/password-field";
import { Button, Field, Notice, Screen, ui } from "../components/ui";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [email, setEmail] = useState(""),
    [otp, setOtp] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [expires, setExpires] = useState(0),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
  async function act(resend = false) {
    if (busy) return;
    if (!validEmail(email)) {
      setError("Nhập địa chỉ email hợp lệ.");
      return;
    }
    if (!resend && step === "reset") {
      const issue =
        passwordIssue(password) ||
        (password !== confirm ? "Mật khẩu nhập lại không khớp." : "");
      if (issue) {
        setError(issue);
        return;
      }
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const normalized = normalizedEmail(email);
      if (step === "request" || resend) {
        const result = await api.request<{ message: string }>(
          "/auth/forgot-password",
          "POST",
          { email: normalized },
        );
        setEmail(normalized);
        setOtp("");
        setPassword("");
        setConfirm("");
        setStep("verify");
        setExpires(Date.now() + 300000);
        setNow(Date.now());
        setNotice(result.message);
      } else if (step === "verify") {
        await api.request("/auth/verify-otp", "POST", {
          email: normalized,
          otp,
        });
        setStep("reset");
      } else {
        await api.request("/auth/reset-password", "POST", {
          email: normalized,
          otp,
          newPassword: password,
          confirmPassword: confirm,
        });
        await api.invalidate();
        router.replace({
          pathname: "/auth",
          params: {
            next: safeNext(params.next),
            notice: "Đã đặt lại mật khẩu. Vui lòng đăng nhập.",
          },
        });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={ui.eyebrow}>
        KHÔI PHỤC TÀI KHOẢN ·{" "}
        {step === "request" ? "1/3" : step === "verify" ? "2/3" : "3/3"}
      </Text>
      <Text style={ui.title}>
        {step === "request"
          ? "Quên mật khẩu?"
          : step === "verify"
            ? "Kiểm tra email"
            : "Mật khẩu mới"}
      </Text>
      <Text style={ui.muted}>
        Mã xác nhận có hiệu lực 5 phút. Không chia sẻ mã với người khác.
      </Text>
      <Field
        label="Email tài khoản"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        editable={!busy && step === "request"}
      />
      {step === "verify" && (
        <Field
          label="Mã xác nhận 6 số"
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
          editable={!busy}
        />
      )}
      {step === "reset" && (
        <>
          <PasswordField
            label="Mật khẩu mới"
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            editable={!busy}
          />
          <PasswordField
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            editable={!busy}
          />
        </>
      )}
      <Notice text={notice} />
      <Notice error text={error} />
      <Button
        title={
          busy
            ? "Đang xử lý…"
            : step === "request"
              ? "Gửi mã xác nhận"
              : step === "verify"
                ? "Xác minh mã"
                : "Đặt lại mật khẩu"
        }
        disabled={
          busy || (step !== "request" && (otp.length !== 6 || seconds === 0))
        }
        onPress={() => void act()}
      />
      {step !== "request" && (
        <>
          <Text style={ui.muted}>
            {seconds > 0
              ? `Mã hết hạn sau ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
              : "Mã đã hết hạn. Hãy yêu cầu mã mới."}
          </Text>
          <Button
            title="Gửi lại mã"
            secondary
            disabled={busy || seconds > 0}
            onPress={() => void act(true)}
          />
          <Button
            title="Dùng email khác"
            secondary
            disabled={busy}
            onPress={() => {
              setStep("request");
              setOtp("");
              setPassword("");
              setConfirm("");
              setError("");
              setNotice("");
            }}
          />
        </>
      )}
      <Button
        title="Quay lại đăng nhập"
        secondary
        disabled={busy}
        onPress={() =>
          router.replace({
            pathname: "/auth",
            params: { next: safeNext(params.next) },
          })
        }
      />
    </Screen>
  );
}
