import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../lib/api";
import { errorMessage, stateLabel, useResource, when } from "../../lib/data";
import { validEmail } from "../../lib/account-validation";
import {
  EntityList,
  useCanManage,
  value,
  type Entity,
} from "../../components/management";
import { HomeSheet } from "../../components/home/primitives";
import { Button, Field, Loading, Notice, Pager, ui } from "../../components/ui";

export function OrganizerTeam() {
  const allowed = useCanManage("organizer");
  const [inviteOpen, setInviteOpen] = useState(false),
    [member, setMember] = useState<Entity | null>(null),
    [eventId, setEventId] = useState(""),
    [email, setEmail] = useState("");
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [eventPage, setEventPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const events = useResource<Entity[]>(
    allowed && inviteOpen
      ? `/organizer/events?status=PUBLISHED&page=${eventPage}&q=${encodeURIComponent(q)}`
      : null,
  );
  const assignments = useResource<Entity[]>(
    allowed && member ? `/organizer/team/${value(member, "id")}/events` : null,
  );
  async function act() {
    if (busy) return;
    if (inviteOpen && (!eventId || !validEmail(email))) {
      setError("Chọn sự kiện và nhập email hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (inviteOpen)
        await api.request("/organizer/team", "POST", {
          eventId,
          email: email.trim().toLowerCase(),
        });
      else if (member && confirm)
        await api.request(
          `/organizer/team/${value(member, "id")}${confirm === "all" ? "" : `/events/${confirm}`}`,
          "DELETE",
        );
      else return;
      setNotice(
        inviteOpen ? "Đã gửi lời mời check-in." : "Đã thu hồi quyền check-in.",
      );
      setInviteOpen(false);
      setEmail("");
      setConfirm("");
      assignments.reload();
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <EntityList
        key={revision}
        scope="organizer"
        title="Đội ngũ Ban tổ chức"
        endpoint="/organizer/team"
        searchable={false}
        header={
          <View style={{ gap: 12 }}>
            <Notice text={notice} />
            <Notice error text={error} />
            <Text style={ui.muted}>
              Nhân sự và phân công thuộc các sự kiện do bạn tổ chức.
            </Text>
            <Button
              title="Mời nhân sự"
              onPress={() => {
                setInviteOpen(true);
                setError("");
                setEventId("");
              }}
            />
          </View>
        }
        listSummary={(data) => (
          <Text style={ui.muted}>
            Chủ tổ chức:{" "}
            {value(data.owner as Entity, "name") ||
              value(data.owner as Entity, "organizationName")}
          </Text>
        )}
        summary={(row) =>
          `${value(row, "email")} · ${value(row, "assignment_count")} phân công`
        }
        onOpen={(row) => {
          setMember(row);
          setConfirm("");
          setError("");
        }}
      />
      <HomeSheet
        visible={inviteOpen}
        title="Mời nhân sự check-in"
        onClose={() => {
          if (!busy) setInviteOpen(false);
        }}
      >
        <Notice error text={error || events.error} />
        <Field
          label="Email nhân sự"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!busy}
        />
        <Field
          label="Tìm sự kiện để phân công"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => {
            setQ(search.trim());
            setEventPage(0);
          }}
        />
        <Button
          title="Tìm sự kiện phân công"
          secondary
          onPress={() => {
            setQ(search.trim());
            setEventPage(0);
          }}
        />
        <Text style={ui.muted}>
          Chọn một sự kiện đã xuất bản. Nhân sự nhận lời mời từ mục Phân công.
        </Text>
        {events.loading ? (
          <Loading />
        ) : (
          events.data?.map((event) => (
            <Button
              key={value(event, "id")}
              title={`${eventId === event.id ? "✓ " : ""}${value(event, "title")}`}
              secondary={eventId !== event.id}
              onPress={() => setEventId(value(event, "id"))}
            />
          ))
        )}
        {!events.loading && !events.error && !events.data?.length && (
          <Notice text="Không có sự kiện phù hợp." />
        )}
        <Pager
          page={eventPage}
          setPage={setEventPage}
          loading={events.loading}
          error={!!events.error}
          more={
            Number(events.data?.[0]?.total_results ?? 0) > (eventPage + 1) * 50
          }
        />
        <Button
          title="Gửi lời mời nhân sự"
          disabled={busy || !eventId || !email.trim()}
          onPress={() => void act()}
        />
      </HomeSheet>
      <HomeSheet
        visible={!!member}
        title="Phân công nhân sự"
        onClose={() => {
          if (!busy) {
            setMember(null);
            setConfirm("");
          }
        }}
      >
        <Text style={ui.h2}>{member && value(member, "name")}</Text>
        <Text style={ui.text}>{member && value(member, "email")}</Text>
        <Notice error text={error || assignments.error} />
        {assignments.loading ? (
          <Loading />
        ) : (
          assignments.data?.map((assignment) => (
            <View key={value(assignment, "id")} style={ui.card}>
              <Text style={ui.h2}>{value(assignment, "title")}</Text>
              <Text style={ui.badge}>
                {stateLabel(value(assignment, "status"))}
              </Text>
              <Text style={ui.muted}>
                Hạn phân công: {when(value(assignment, "expires_at"))}
              </Text>
              {["PENDING", "ACTIVE"].includes(value(assignment, "status")) && (
                <Button
                  title={`Thu hồi ${value(assignment, "title")}`}
                  secondary
                  disabled={busy}
                  onPress={() => setConfirm(value(assignment, "id"))}
                />
              )}
            </View>
          ))
        )}
        {assignments.data?.some((a) =>
          ["PENDING", "ACTIVE"].includes(value(a, "status")),
        ) && (
          <Button
            title="Thu hồi tất cả phân công của nhân sự"
            secondary
            disabled={busy}
            onPress={() => setConfirm("all")}
          />
        )}
        {!!confirm && (
          <View style={ui.card}>
            <Text style={ui.text}>
              {confirm === "all"
                ? "Thu hồi mọi quyền check-in của nhân sự tại các sự kiện của bạn?"
                : "Thu hồi phân công được chọn?"}
            </Text>
            <Button
              title="Xác nhận thu hồi nhân sự"
              disabled={busy}
              onPress={() => void act()}
            />
            <Button
              title="Giữ phân công"
              secondary
              disabled={busy}
              onPress={() => setConfirm("")}
            />
          </View>
        )}
      </HomeSheet>
    </>
  );
}
