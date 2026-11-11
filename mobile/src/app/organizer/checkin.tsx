import { router } from "expo-router";
import { EntityList, value } from "../../components/management";
export default function OrganizerCheckin() {
  return (
    <EntityList
      scope="organizer"
      title="Chọn sự kiện check-in"
      endpoint="/organizer/events"
      onOpen={(row) =>
        router.push({
          pathname: "/checkin/[id]",
          params: { id: value(row, "id") },
        })
      }
      summary={(row) =>
        `${value(row, "venue_name")} · ${value(row, "starts_at")}`
      }
    />
  );
}
