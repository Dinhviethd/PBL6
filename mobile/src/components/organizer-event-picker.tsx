import { useState } from "react";
import { Text } from "react-native";
import { useResource } from "../lib/data";
import { HomeSheet } from "./home/primitives";
import { useCanManage, value, type Entity } from "./management";
import { Button, Field, Loading, Notice, Pager, ui } from "./ui";
export function OrganizerEventPicker({
  value: selected,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const allowed = useCanManage("organizer");
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(0),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [label, setLabel] = useState("Tất cả sự kiện");
  const events = useResource<Entity[]>(
    allowed && open
      ? `/organizer/events?page=${page}&q=${encodeURIComponent(q)}`
      : null,
  );
  return (
    <>
      <Button
        title={`Sự kiện thống kê: ${selected ? label : "Tất cả sự kiện"}`}
        secondary
        onPress={() => setOpen(true)}
      />
      <HomeSheet
        visible={open}
        title="Chọn sự kiện thống kê"
        onClose={() => setOpen(false)}
      >
        <Field
          label="Tìm sự kiện thống kê"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => {
            setQ(search.trim());
            setPage(0);
          }}
        />
        <Button
          title="Tìm sự kiện"
          secondary
          onPress={() => {
            setQ(search.trim());
            setPage(0);
          }}
        />
        <Button
          title="Tất cả sự kiện"
          secondary={!!selected}
          onPress={() => {
            onChange("");
            setOpen(false);
          }}
        />
        <Notice error text={events.error} />
        {events.loading ? (
          <Loading />
        ) : (
          events.data?.map((event) => (
            <Button
              key={value(event, "id")}
              title={value(event, "title")}
              secondary={event.id !== selected}
              onPress={() => {
                setLabel(value(event, "title"));
                onChange(value(event, "id"));
                setOpen(false);
              }}
            />
          ))
        )}
        {!events.loading && !events.error && !events.data?.length && (
          <Text style={ui.muted}>Không có sự kiện phù hợp.</Text>
        )}
        <Pager
          page={page}
          setPage={setPage}
          loading={events.loading}
          error={!!events.error}
          more={Number(events.data?.[0]?.total_results ?? 0) > (page + 1) * 50}
        />
      </HomeSheet>
    </>
  );
}
