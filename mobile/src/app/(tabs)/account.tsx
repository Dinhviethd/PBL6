import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { errorMessage } from "../../lib/data";
import { Button, Notice, RequireAuth, Screen, ui } from "../../components/ui";
export default function AccountScreen() {
  const { user, setUser } = useSession(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    try {
      await api.logout();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUser(null);
      setBusy(false);
      router.replace("/");
    }
  }
  return (
    <RequireAuth>
      <Screen>
        <Text style={ui.eyebrow}>TÀI KHOẢN EVENTHUB</Text>
        <Text style={ui.title}>{user?.name}</Text>
        <View style={ui.card}>
          <Text style={ui.text}>{user?.email}</Text>
          <Text style={ui.muted}>
            Tài khoản dùng chung trên web và mobile. Các phân công check-in được
            ban tổ chức quản lý theo từng sự kiện.
          </Text>
        </View>
        <Notice error text={error} />
        <Button
          title="Đăng xuất"
          secondary
          disabled={busy}
          onPress={() => void logout()}
        />
      </Screen>
    </RequireAuth>
  );
}
