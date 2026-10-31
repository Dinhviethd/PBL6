import type { Row, Store } from "../../../contracts/core";

export const organizerColumns = {
  organizationName: "organization_name",
  businessName: "business_name",
  taxIdOrBusinessLicense: "tax_id_or_business_license",
  contactName: "contact_name",
  contactEmail: "contact_email",
  contactPhone: "contact_phone",
  headOfficeAddress: "head_office_address",
  description: "description",
  websiteOrSocial: "website_or_social",
  logoUrl: "logo_url",
} as const;

/** All profile information stays on the owner's approved application. */
export function organizerIdentityStore(db: Store) {
  return {
    lockOwner: (id: string) =>
      db.query('SELECT "idUser" FROM users WHERE "idUser"=$1 FOR UPDATE', [id]),
    user: async (id: string) =>
      (
        await db.query(
          'SELECT "idUser",name,email,"avatarUrl" FROM users WHERE "idUser"=$1',
          [id],
        )
      )[0],
    approvedApplication: async (owner: string) =>
      (
        await db.query(
          "SELECT * FROM organizer_applications WHERE user_id=$1 AND status='APPROVED' ORDER BY reviewed_at DESC,id LIMIT 1",
          [owner],
        )
      )[0],
    sampleApplication: async () =>
      (
        await db.query(
          "SELECT * FROM organizer_applications ORDER BY id LIMIT 1",
        )
      )[0],
    update: async (id: string, changes: Row) => {
      const allowed: Set<string> = new Set([
        ...Object.values(organizerColumns),
        "pending_legal_changes",
      ]);
      const entries = Object.entries(changes).filter(([key]) =>
        allowed.has(key),
      );
      if (!entries.length) return;
      await db.query(
        `UPDATE organizer_applications SET ${entries.map(([key], i) => `${key}=$${i + 2}`).join(",")} WHERE id=$1 AND status='APPROVED'`,
        [id, ...entries.map(([, value]) => value)],
      );
    },
    pending: (offset = 0) =>
      db.query(
        "SELECT * FROM organizer_applications WHERE status='APPROVED' AND pending_legal_changes IS NOT NULL ORDER BY id LIMIT 50 OFFSET $1",
        [offset],
      ),
    request: async (id: string) =>
      (
        await db.query(
          "SELECT * FROM organizer_applications WHERE status='APPROVED' AND pending_legal_changes->>'id'=$1",
          [id],
        )
      )[0],
  };
}
