import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { errorMessage } from "../lib/data";
import { Button, Field, Notice, Screen, ui } from "../components/ui";
import { PasswordField } from "../components/password-field";
import { IconBadge } from "../components/app-icon";
import {
  normalizedEmail,
  passwordIssue,
  safeNext,
  validEmail,
} from "../lib/account-validation";
export default function AuthScreen() {
  const { next, notice } = useLocalSearchParams<{
      next?: string;
      notice?: string;
    }>(),
    { setUser } = useSession();
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    if (!validEmail(email)) {
      setError("Nhập địa chỉ email hợp lệ.");
      return;
    }
    if (register && passwordIssue(password)) {
      setError(passwordIssue(password));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await api.authenticate(register ? "register" : "login", {
        name,
        email: normalizedEmail(email),
        password,
        confirmPassword: confirmation,
      });
      setUser(user);
      setPassword("");
      setConfirmation("");
      router.replace(safeNext(next) as Href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={ui.eyebrow}>TRẢI NGHIỆM BẮT ĐẦU TỪ ĐÂY</Text>
      <IconBadge name={register ? "user-plus" : "log-in"} size={56} />
      <Text style={ui.title}>
        {register ? "Tạo tài khoản." : "Chào mừng trở lại."}
      </Text>
      <Text style={ui.muted}>
        Một tài khoản dùng chung cho web và ứng dụng.
      </Text>
      <Notice text={notice} />
      {register && (
        <Field
          label="Họ và tên"
          icon="user"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />
      )}
      <Field
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <PasswordField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
      />
      {register && (
        <PasswordField
          label="Nhập lại mật khẩu"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
        />
      )}
      <Notice error text={error} />
      {!register && (
        <Button
          title="Quên mật khẩu?"
          icon="help-circle"
          secondary
          disabled={busy}
          onPress={() =>
            router.push({
              pathname: "/reset-password",
              params: { next: safeNext(next) },
            })
          }
        />
      )}
      <Button
        title={busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}
        icon={register ? "user-plus" : "log-in"}
        disabled={
          busy ||
          !email ||
          !password ||
          (register &&
            (!name.trim() || password.length < 8 || password !== confirmation))
        }
        onPress={() => void submit()}
      />
      <Button
        title={
          register ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"
        }
        secondary
        disabled={busy}
        onPress={() => {
          setRegister(!register);
          setError("");
        }}
      />
    </Screen>
  );
}
