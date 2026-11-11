import { useRef, useState } from "react";
import { Switch, Text, View } from "react-native";
import { api } from "../lib/api";
import { errorMessage, useResource } from "../lib/data";
import { validEmail } from "../lib/account-validation";
import { useSession } from "../lib/session";
import type { User } from "../lib/api-client";
import {
  Button,
  Field,
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
} from "../components/ui";
import { DetailFields, type Entity } from "../components/management";

const steps: [string, string, number][][] = [
  [
    ["organizationName", "Tên Ban tổ chức", 200],
    ["contactName", "Người liên hệ", 150],
    ["contactEmail", "Email liên hệ", 254],
    ["contactPhone", "Số điện thoại liên hệ", 30],
  ],
  [
    ["businessName", "Tên pháp nhân", 200],
    ["taxIdOrBusinessLicense", "Mã số thuế / Giấy phép kinh doanh", 100],
    ["headOfficeAddress", "Địa chỉ trụ sở", 500],
    ["websiteOrSocial", "Website / Mạng xã hội", 500],
  ],
  [
    ["description", "Giới thiệu tổ chức", 4000],
    ["mainEventCategory", "Loại sự kiện chính", 200],
    ["expectedEventScale", "Quy mô sự kiện dự kiến", 100],
  ],
];
export default function RegisterOrganizerScreen() {
  const { user, setUser } = useSession(),
    applications = useResource<Entity[]>(
      user ? "/me/organizer-applications" : null,
    );
  const [form, setForm] = useState<Record<string, string>>({
    contactName: user?.name ?? "",
    contactEmail: user?.email ?? "",
  });
  const [step, setStep] = useState(0),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    latest = applications.data?.[0];
  const canApply = !latest || latest.status === "REJECTED";
  function next() {
    if (steps[step]?.some(([key]) => !form[key]?.trim())) {
      setError("Vui lòng nhập đầy đủ các trường trong bước này.");
      return;
    }
    if (step === 0 && !validEmail(form.contactEmail ?? "")) {
      setError("Email liên hệ không hợp lệ.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  async function submit() {
    if (lock.current || !accepted) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.request(
        "/me/organizer-applications",
        "POST",
        Object.fromEntries(
          Object.entries(form).map(([key, val]) => [key, val.trim()]),
        ),
      );
      applications.reload();
      setStep(0);
      setAccepted(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function refreshRole() {
    try {
      setUser(await api.request<User>("/auth/me"));
      applications.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <RequireAuth>
      <Screen refresh={applications.reload} loading={applications.loading}>
        <Text style={ui.title}>Trở thành Ban tổ chức</Text>
        <Notice error text={error || applications.error} />
        {applications.loading && !applications.data ? (
          <Loading />
        ) : applications.error ? (
          <Button title="Thử lại" onPress={applications.reload} />
        ) : (
          <>
            {latest && (
              <>
                <Text style={ui.badge}>
                  {latest.status === "PENDING"
                    ? "Chờ xét duyệt"
                    : latest.status === "APPROVED"
                      ? "Đã phê duyệt"
                      : "Đã từ chối"}
                </Text>
                <DetailFields
                  row={latest}
                  fields={[
                    ["organization_name", "Ban tổ chức"],
                    ["created_at", "Ngày nộp"],
                    ["rejection_reason", "Phản hồi"],
                  ]}
                />
              </>
            )}
            {latest?.status === "APPROVED" ? (
              <Button
                title="Cập nhật quyền Ban tổ chức"
                onPress={() => void refreshRole()}
              />
            ) : (
              canApply && (
                <>
                  <Text style={ui.eyebrow}>BƯỚC {step + 1}/4</Text>
                  {step < 3 ? (
                    steps[step].map(([key, label, maxLength]) => (
                      <Field
                        key={key}
                        label={label}
                        value={form[key] ?? ""}
                        onChangeText={(text) =>
                          setForm((f) => ({ ...f, [key]: text }))
                        }
                        maxLength={maxLength}
                        editable={!busy}
                        multiline={key === "description"}
                        keyboardType={
                          key === "contactEmail"
                            ? "email-address"
                            : key === "contactPhone"
                              ? "phone-pad"
                              : "default"
                        }
                      />
                    ))
                  ) : (
                    <>
                      <DetailFields
                        row={form}
                        fields={steps
                          .flat()
                          .map(([key, label]) => [key, label])}
                      />
                      <View style={ui.row}>
                        <Switch
                          accessibilityLabel="Xác nhận thông tin hồ sơ chính xác"
                          value={accepted}
                          onValueChange={setAccepted}
                        />
                        <Text style={{ ...ui.text, flex: 1 }}>
                          Tôi xác nhận thông tin hồ sơ chính xác.
                        </Text>
                      </View>
                    </>
                  )}
                  {step < 3 ? (
                    <Button title="Tiếp tục" onPress={next} />
                  ) : (
                    <Button
                      title={busy ? "Đang gửi…" : "Gửi hồ sơ xét duyệt"}
                      disabled={busy || !accepted}
                      onPress={() => void submit()}
                    />
                  )}
                  {step > 0 && (
                    <Button
                      title="Quay lại bước trước"
                      secondary
                      disabled={busy}
                      onPress={() => {
                        setError("");
                        setStep((s) => s - 1);
                      }}
                    />
                  )}
                </>
              )
            )}
          </>
        )}
      </Screen>
    </RequireAuth>
  );
}
