import { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, mediaUrl } from "../lib/api";
import type { User } from "../lib/api-client";
import { useSession } from "../lib/session";
import { errorMessage, useResource } from "../lib/data";
import {
  Button,
  Field,
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
} from "../components/ui";

function ProfileForm({ profile }: { profile: User }) {
  const { setUser } = useSession();
  const [name, setName] = useState(profile.name),
    [phone, setPhone] = useState(profile.phone ?? "");
  const [avatar, setAvatar] = useState(profile.avatarUrl ?? ""),
    [busy, setBusy] = useState(false);
  const [savedProfile, setSavedProfile] = useState(profile);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function save(avatarUrl = avatar, avatarOnly = false) {
    const updated = await api.request<User>("/me", "PATCH", {
      name: avatarOnly ? savedProfile.name : name.trim(),
      phone: avatarOnly ? (savedProfile.phone ?? "") : phone.trim(),
      ...(avatarUrl ? { avatarUrl } : {}),
    });
    setUser(updated);
    setSavedProfile(updated);
    setAvatar(updated.avatarUrl ?? "");
    setNotice(
      avatarOnly ? "Đã cập nhật ảnh đại diện." : "Đã lưu thông tin cá nhân.",
    );
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await save();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function pickAvatar() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
        throw new Error("Chọn ảnh không quá 5 MB.");
      const form = new FormData();
      if (Platform.OS === "web") {
        const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
        form.append("image", blob, asset.fileName ?? "avatar.jpg");
      } else {
        form.append("image", {
          uri: asset.uri,
          name: asset.fileName ?? "avatar.jpg",
          type: asset.mimeType ?? "image/jpeg",
        } as unknown as Blob);
      }
      const uploaded = await api.request<{ url: string }>(
        "/media",
        "POST",
        form,
      );
      await save(uploaded.url, true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={ui.eyebrow}>THÔNG TIN CÁ NHÂN</Text>
      <Text style={ui.title}>Hồ sơ của bạn</Text>
      <View style={ui.card}>
        {avatar ? (
          <Image
            accessible
            accessibilityRole="image"
            accessibilityLabel="Ảnh đại diện"
            source={{ uri: mediaUrl(avatar) }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignSelf: "center",
            }}
          />
        ) : (
          <Text style={{ ...ui.title, textAlign: "center" }}>
            {profile.name.slice(0, 1).toUpperCase()}
          </Text>
        )}
        <Button
          title={busy ? "Đang xử lý…" : "Thay ảnh đại diện"}
          icon="camera"
          secondary
          disabled={busy}
          onPress={() => void pickAvatar()}
        />
        <Text style={ui.muted}>
          Ảnh tối đa 5 MB. Ảnh được lưu riêng với thông tin bên dưới.
        </Text>
      </View>
      <Field
        label="Họ và tên"
        icon="user"
        value={name}
        onChangeText={setName}
        maxLength={150}
        autoComplete="name"
        editable={!busy}
      />
      <Field
        label="Số điện thoại"
        icon="phone"
        value={phone}
        onChangeText={setPhone}
        maxLength={30}
        keyboardType="phone-pad"
        autoComplete="tel"
        editable={!busy}
      />
      <View style={ui.card}>
        <Text style={ui.muted}>Email</Text>
        <Text selectable style={ui.text}>
          {profile.email}
        </Text>
      </View>
      <Text style={ui.muted}>
        Email dùng để đăng nhập và nhận thông báo về vé.
      </Text>
      <Notice error text={error} />
      <Notice text={notice} />
      <Button
        title={busy ? "Đang lưu…" : "Lưu thay đổi"}
        icon="check"
        disabled={busy || !name.trim()}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
export default function ProfileScreen() {
  const { user } = useSession();
  const resource = useResource<User>(user ? "/auth/me" : null);
  return (
    <RequireAuth>
      {resource.data ? (
        <ProfileForm key={user?.idUser} profile={resource.data} />
      ) : (
        <Screen>
          {resource.loading ? (
            <Loading />
          ) : (
            <>
              <Notice error text={resource.error} />
              <Button title="Thử lại" onPress={resource.reload} />
            </>
          )}
        </Screen>
      )}
    </RequireAuth>
  );
}
