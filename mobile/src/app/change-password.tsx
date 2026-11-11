import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";
import { errorMessage } from "../lib/data";
import { passwordIssue } from "../lib/account-validation";
import { PasswordField } from "../components/password-field";
import { Button, Notice, RequireAuth, Screen, ui } from "../components/ui";

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    const issue =
      passwordIssue(password) ||
      (password !== confirm ? "Mật khẩu nhập lại không khớp." : "");
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.request("/me/password", "POST", {
        currentPassword: current,
        newPassword: password,
      });
      await api.invalidate();
      router.replace({
        pathname: "/auth",
        params: { notice: "Đã đổi mật khẩu. Vui lòng đăng nhập lại." },
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireAuth>
      <Screen>
        <Text style={ui.title}>Đổi mật khẩu</Text>
        <Text style={ui.muted}>
          Sau khi cập nhật, các phiên đăng nhập trên mọi thiết bị sẽ kết thúc.
        </Text>
        <PasswordField
          label="Mật khẩu hiện tại"
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          editable={!busy}
        />
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
        <Notice error text={error} />
        <Button
          title={busy ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
          disabled={busy || !current || !password || !confirm}
          onPress={() => void submit()}
        />
      </Screen>
    </RequireAuth>
  );
}
