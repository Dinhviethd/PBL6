import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { errorMessage } from "../lib/data";
import { Button, Field, Notice, Screen, ui } from "../components/ui";
export default function AuthScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>(),
    { setUser } = useSession();
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const user = await api.authenticate(register ? "register" : "login", {
        name,
        email: email.trim().toLowerCase(),
        password,
        confirmPassword: confirmation,
      });
      setUser(user);
      setPassword("");
      setConfirmation("");
      router.replace(
        (next?.startsWith("/") && !next.startsWith("//") && next !== "/auth"
          ? next
          : "/") as Href,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={ui.eyebrow}>TRẢI NGHIỆM BẮT ĐẦU TỪ ĐÂY</Text>
      <Text style={ui.title}>
        {register ? "Tạo tài khoản." : "Chào mừng trở lại."}
      </Text>
      <Text style={ui.muted}>
        Một tài khoản dùng chung cho web và ứng dụng.
      </Text>
      {register && (
        <Field
          label="Họ và tên"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />
      )}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
      />
      {register && (
        <Field
          label="Nhập lại mật khẩu"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
        />
      )}
      <Notice error text={error} />
      <Button
        title={busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : "Đăng nhập"}
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
