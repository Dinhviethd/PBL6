import {
  ensure,
  role,
  type Principal,
  type UnitOfWork,
} from "../contracts/core";
import type { Events } from "../modules/event/public";
import type { Orders } from "../modules/order/public";
import type { Auth } from "../modules/auth/public";
import type { createBooking } from "./booking";

/** Aggregation stays in each owner; no cross-domain repository joins. */
export function createOrganizerProfileStats(
  events: Pick<Events, "organizerProfileEvents">,
  orders: Pick<Orders, "organizerProfileTicketCount">,
  snapshot: UnitOfWork,
) {
  return async (principal: Principal) => {
    role(principal, ["ORGANIZER", "ADMIN"]);
    return snapshot.run(async () => {
      const scope = await events.organizerProfileEvents(principal.userId);
      const tickets = await orders.organizerProfileTicketCount(
        scope.map((event) => event.id as string),
      );
      return {
        publishedEvents: scope.filter((event) => event.published_at !== null)
          .length,
        servedTickets: String(tickets.served_tickets),
        definitions: {
          publishedEvents: "EVENTS_EVER_PUBLISHED",
          servedTickets: "PAID_VALID_OR_CHECKED_IN_TICKETS",
        },
        asOf: new Date().toISOString(),
      };
    });
  };
}

export function createOrganizerTeamWorkflow(
  auth: Auth,
  events: Events,
  booking: ReturnType<typeof createBooking>,
  uow: UnitOfWork,
) {
  async function ownEvent(p: Principal, eventId: string) {
    role(p, ["ORGANIZER", "ADMIN"]);
    const event = await events.guard(eventId, p, true);
    ensure(
      event.organizer_id === p.userId,
      "FORBIDDEN",
      "Sự kiện không thuộc BTC của bạn.",
      403,
    );
    return event;
  }
  return {
    async list(p: Principal, page: number) {
      role(p, ["ORGANIZER", "ADMIN"]);
      const rows = await events.organizerStaffPage(p.userId, page * 50);
      const owner = await auth.organizerProfileOwner(p);
      return {
        owner,
        items: rows.slice(0, 50).map((row) => ({ ...row, id: row.user_id })),
        hasNext: rows.length > 50,
      };
    },
    invite: (p: Principal, eventId: string, email: string) =>
      uow.run(async () => {
        await ownEvent(p, eventId);
        return booking.inviteStaff(p, eventId, email);
      }),
    async assignments(p: Principal, userId: string) {
      role(p, ["ORGANIZER", "ADMIN"]);
      return events.organizerStaffAssignments(p.userId, userId);
    },
    revokeAssignment: (p: Principal, userId: string, staffId: string) =>
      uow.run(async () => {
        role(p, ["ORGANIZER", "ADMIN"]);
        const assignment = await events.staffInvitation(staffId);
        ensure(
          assignment?.user_id === userId,
          "NOT_FOUND",
          "Không tìm thấy phân công.",
          404,
        );
        await ownEvent(p, assignment.event_id);
        return booking.revokeStaff(p, assignment.event_id, staffId);
      }),
    revoke: (p: Principal, userId: string) =>
      uow.run(async () => {
        role(p, ["ORGANIZER", "ADMIN"]);
        // Owner-scoped grants only; Event locks follow the existing workflow order.
        const assignments = await events.organizerStaffAssignments(
          p.userId,
          userId,
        );
        ensure(
          assignments.length > 0,
          "NOT_FOUND",
          "Không tìm thấy nhân sự thuộc BTC.",
          404,
        );
        for (const assignment of assignments)
          if (["PENDING", "ACTIVE"].includes(assignment.status)) {
            await ownEvent(p, assignment.event_id);
            await booking.revokeStaff(p, assignment.event_id, assignment.id);
          }
        return { revoked: true };
      }),
  };
}
