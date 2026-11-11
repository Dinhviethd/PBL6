import { useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { api, mediaUrl } from "../../lib/api";
import { useSession } from "../../lib/session";
import { errorMessage } from "../../lib/data";
import { Notice, RequireAuth, Screen, ui, colors } from "../../components/ui";
import { MenuRow } from "../../components/mobile-patterns";
export default function AccountScreen() {
  const { user } = useSession(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [failedAvatar, setFailedAvatar] = useState<string>();
  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireAuth>
      <Screen>
        <Text style={ui.eyebrow}>TÀI KHOẢN EVENTHUB</Text>
        <View
          style={[
            ui.card,
            { flexDirection: "row", alignItems: "center", gap: 16 },
          ]}
        >
          {user?.avatarUrl && failedAvatar !== user.avatarUrl ? (
            <Image
              source={{ uri: mediaUrl(user.avatarUrl) }}
              accessibilityLabel="Ảnh đại diện"
              onError={() => setFailedAvatar(user.avatarUrl!)}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.accentSurface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[ui.h2, { color: colors.primary }]}>
                {user?.name.trim().slice(0, 1).toUpperCase() || "E"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text accessibilityRole="header" style={ui.h2}>
              {user?.name}
            </Text>
            <Text selectable style={ui.muted}>
              {user?.email}
            </Text>
          </View>
        </View>
        <Text style={ui.muted}>
          Tài khoản dùng chung trên web và mobile. Các phân công check-in được
          ban tổ chức quản lý theo từng sự kiện.
        </Text>
        <Notice error text={error} />
        <Text style={ui.h2}>Cá nhân</Text>
        <View
          style={{
            borderRadius: 20,
            borderCurve: "continuous",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MenuRow
            title="Chỉnh sửa hồ sơ"
            icon="user"
            subtitle="Thông tin và ảnh đại diện"
            onPress={() => router.push("/profile")}
          />
          <MenuRow
            title="Đổi mật khẩu"
            icon="shield"
            subtitle="Bảo mật tài khoản"
            onPress={() => router.push("/change-password")}
          />
          <MenuRow
            title="Đơn hàng của tôi"
            icon="shopping-bag"
            onPress={() => router.push("/orders")}
          />
          <MenuRow
            title="Thông báo"
            icon="bell"
            last
            onPress={() => router.push("/notifications")}
          />
        </View>
        <Text style={ui.h2}>Công việc</Text>
        <View
          style={{
            borderRadius: 20,
            borderCurve: "continuous",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {user?.roles.some((role) => ["ORGANIZER", "ADMIN"].includes(role)) ? (
            <MenuRow
              title="Không gian Ban tổ chức"
              icon="briefcase"
              onPress={() => router.push("/organizer")}
            />
          ) : (
            <MenuRow
              title="Đăng ký Ban tổ chức"
              icon="briefcase"
              onPress={() => router.push("/register-organizer")}
            />
          )}
          {user?.roles.includes("ADMIN") && (
            <MenuRow
              title="Không gian Quản trị"
              icon="grid"
              onPress={() => router.push("/admin")}
            />
          )}
          <MenuRow
            title="Phân công và lời mời check-in"
            icon="maximize"
            last
            onPress={() => router.push("/staff")}
          />
        </View>
        <View
          style={{
            borderRadius: 20,
            borderCurve: "continuous",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MenuRow
            title="Đăng xuất"
            icon="log-out"
            destructive
            last
            disabled={busy}
            onPress={() => void logout()}
          />
        </View>
      </Screen>
    </RequireAuth>
  );
}
