import { useParams } from "react-router-dom";
import { CheckinStation } from "@/components/ticketing/checkin-station";
import { useAuth } from "@/features/auth/stores/authStore";

export function StaffCheckin() {
  const { id = "" } = useParams();
  const revision = useAuth((state) => state.revision);
  return (
    <CheckinStation
      key={`${revision}:${id}`}
      eventId={id}
      backTo="/checkin"
      backLabel="Sự kiện được phân công"
      staff
    />
  );
}
