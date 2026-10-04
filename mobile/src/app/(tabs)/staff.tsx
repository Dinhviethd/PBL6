import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import {
  errorMessage,
  stateLabel,
  useResource,
  when,
  type Assignment,
} from "../../lib/data";
import {
  Button,
  Loading,
  Notice,
  Pager,
  RequireAuth,
  Screen,
  ui,
} from "../../components/ui";
export default function StaffScreen() {
  const { user } = useSession(),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    r = useResource<Assignment[]>(
      user ? `/me/checkin-assignments?page=${page}` : null,
    );
  async function respond(id: string, accept: boolean) {
    setBusy(true);
    setError("");
    try {
      await api.request(`/me/checkin-invitations/${id}/respond`, "POST", {
        accept,
      });
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Text style={ui.eyebrow}>DÀNH CHO NHÂN VIÊN</Text>
        <Text style={ui.title}>Sự kiện được phân công.</Text>
        <Text style={ui.muted}>
          Nhận lời mời từ ban tổ chức để quét vé tại cửa vào.
        </Text>
        <Notice error text={error || r.error} />
        <Button
          title="Làm mới phân công"
          secondary
          disabled={r.loading}
          onPress={r.reload}
        />
        {r.loading ? (
          <Loading />
        ) : !r.data?.length ? (
          <Text style={ui.muted}>
            Chưa có lời mời. Ban tổ chức có thể mời bằng email tài khoản của
            bạn.
          </Text>
        ) : (
          r.data.map((s) => {
            const open =
                !["CANCELLED", "ARCHIVED"].includes(s.event_status) &&
                new Date(s.ends_at) > new Date(),
              pending =
                s.status === "PENDING" && new Date(s.expires_at) > new Date();
            return (
              <View style={ui.card} key={s.id}>
                <Text style={ui.badge}>
                  {s.status === "PENDING" && !pending
                    ? "Lời mời hết hạn"
                    : stateLabel(s.status)}
                </Text>
                <Text style={ui.h2}>{s.title}</Text>
                <Text style={ui.text}>{s.venue_name}</Text>
                <Text style={ui.muted}>
                  Check-in: {when(s.checkin_opens_at)} –{" "}
                  {when(s.checkin_closes_at)}
                </Text>
                {!open && <Text style={ui.muted}>Sự kiện đã đóng.</Text>}
                {open && pending && (
                  <>
                    <Text style={ui.muted}>
                      Chấp nhận trước {when(s.expires_at)}
                    </Text>
                    <Button
                      title="Chấp nhận lời mời"
                      disabled={busy}
                      onPress={() => void respond(s.id, true)}
                    />
                    <Button
                      title="Từ chối"
                      secondary
                      disabled={busy}
                      onPress={() => void respond(s.id, false)}
                    />
                  </>
                )}
                {open && s.status === "ACTIVE" && (
                  <Button
                    title="Mở quét vé"
                    onPress={() =>
                      router.push({
                        pathname: "/checkin/[id]",
                        params: { id: s.event_id },
                      })
                    }
                  />
                )}
              </View>
            );
          })
        )}
        <Pager page={page} setPage={setPage} more={r.data?.length === 50} />
      </Screen>
    </RequireAuth>
  );
}
