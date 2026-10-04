import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";
import { ApiError } from "../../lib/api-client";
import { useSession } from "../../lib/session";
import {
  errorMessage,
  useResource,
  when,
  type Assignment,
} from "../../lib/data";
import {
  Button,
  Field,
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
} from "../../components/ui";
export default function ScannerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useSession(),
    r = useResource<Assignment>(user ? `/checkin/events/${id}` : null);
  const [permission, requestPermission] = useCameraPermissions(),
    [camera, setCamera] = useState(false),
    [focused, setFocused] = useState(false),
    [foreground, setForeground] = useState(AppState.currentState === "active"),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(""),
    [duplicate, setDuplicate] = useState(false),
    [denied, setDenied] = useState(false);
  const inFlight = useRef(false),
    cameraArmed = useRef(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setDenied(false);
      return () => {
        setFocused(false);
        setCamera(false);
        cameraArmed.current = false;
      };
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") {
        setCamera(false);
        cameraArmed.current = false;
      }
    });
    return () => listener.remove();
  }, []);
  async function scan(value: string) {
    if (inFlight.current || !value.trim() || denied) return;
    inFlight.current = true;
    cameraArmed.current = false;
    setCamera(false);
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await api.request<{
        duplicate: boolean;
        checked_in_at: string;
      }>(`/checkin/events/${id}/checkins`, "POST", { code: value.trim() });
      setDuplicate(response.duplicate);
      setResult(
        response.duplicate
          ? `Vé đã check-in lúc ${when(response.checked_in_at)}.`
          : `Check-in thành công · ${when(response.checked_in_at)}`,
      );
      setCode("");
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 403) {
        setDenied(true);
        r.reload();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function startCamera() {
    setError("");
    setResult("");
    try {
      const granted =
        permission?.granted || (await requestPermission()).granted;
      if (!granted) {
        setError(
          "Chưa có quyền camera. Bạn có thể mở cài đặt hoặc nhập mã vé bên dưới.",
        );
        return;
      }
      cameraArmed.current = true;
      setCamera(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <RequireAuth>
      <Screen>
        <Notice error text={r.error || error} />
        {r.loading && !r.data ? (
          <Loading />
        ) : (
          r.data &&
          !denied && (
            <>
              <Text style={ui.title}>{r.data.title}</Text>
              <Text style={ui.muted}>
                {r.data.venue_name} · {when(r.data.checkin_opens_at)} –{" "}
                {when(r.data.checkin_closes_at)}
              </Text>
              <Notice text={result} error={duplicate} />
              {camera && focused && foreground && permission?.granted ? (
                <CameraView
                  accessibilityLabel="Camera quét QR"
                  style={{ height: 320, borderRadius: 20, overflow: "hidden" }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={({ data }) => {
                    if (cameraArmed.current) {
                      cameraArmed.current = false;
                      void scan(data);
                    }
                  }}
                  onMountError={() => {
                    setCamera(false);
                    cameraArmed.current = false;
                    setError(
                      "Không mở được camera. Hãy nhập mã vé hoặc thử lại.",
                    );
                  }}
                />
              ) : (
                <View
                  style={{
                    ...ui.card,
                    alignItems: "center",
                    paddingVertical: 32,
                  }}
                >
                  <Text style={ui.h2}>Sẵn sàng đón khách</Text>
                  <Text style={ui.muted}>
                    Đưa mã QR của vé vào khung camera.
                  </Text>
                </View>
              )}
              <Button
                title={camera ? "Dừng camera" : "Bật camera quét QR"}
                disabled={busy}
                onPress={() => {
                  if (camera) {
                    setCamera(false);
                    cameraArmed.current = false;
                  } else void startCamera();
                }}
              />
              {permission && !permission.granted && !permission.canAskAgain && (
                <Button
                  title="Mở cài đặt camera"
                  secondary
                  onPress={() =>
                    void Linking.openSettings().catch(() =>
                      setError("Hãy mở cài đặt ứng dụng để cấp quyền camera."),
                    )
                  }
                />
              )}
              <Field
                label="Mã vé / nội dung QR"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                title={busy ? "Đang xác nhận…" : "Kiểm tra & check-in"}
                disabled={busy || !code.trim()}
                onPress={() => void scan(code)}
              />
              <Text style={ui.muted}>
                Chỉ ghi nhận thành công khi máy chủ xác nhận. Mỗi vé chỉ sử dụng
                một lần.
              </Text>
            </>
          )
        )}
      </Screen>
    </RequireAuth>
  );
}
