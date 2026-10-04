import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
export function authStore(db: Store) {
  return {
    checkinActorNames: (ids: string[]) =>
      db.query(
        'SELECT "idUser",name FROM users WHERE "idUser"=ANY($1::uuid[])',
        [ids],
      ),
    user: async (id: string) =>
      (await db.query('SELECT * FROM users WHERE "idUser"=$1', [id]))[0],
    byEmail: async (email: string) =>
      (await db.query("SELECT * FROM users WHERE email=$1", [email]))[0],
    lockUser: (id: string) =>
      db.query('SELECT "idUser" FROM users WHERE "idUser"=$1 FOR UPDATE', [id]),
    roles: (id: string) =>
      db.query(
        'SELECT r.code FROM roles r JOIN users_roles ur ON ur."idRole"=r."idRole" WHERE ur."idUser"=$1',
        [id],
      ),
    permissions: (id: string) =>
      db.query(
        'SELECT DISTINCT p.code FROM permissions p JOIN roles_permissions rp ON rp."idPermission"=p."idPermission" JOIN users_roles ur ON ur."idRole"=rp."idRole" WHERE ur."idUser"=$1',
        [id],
      ),
    create: async (data: Row) =>
      (
        await db.query(
          'INSERT INTO users("idUser",name,email,password,phone) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [
            randomUUID(),
            data.name,
            data.email,
            data.password,
            data.phone ?? null,
          ],
        )
      )[0],
    grant: (id: string, code: string) =>
      db.query(
        'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING',
        [id, code],
      ),
    session: async (id: string, lock = false) =>
      (
        await db.query(
          `SELECT * FROM auth_sessions WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
          [id],
        )
      )[0],
    newSession: (id: string, user: string, hash: string) =>
      db.query(
        "INSERT INTO auth_sessions(id,user_id,refresh_token_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
        [id, user, hash],
      ),
    rotate: (id: string, hash: string) =>
      db.query(
        "UPDATE auth_sessions SET refresh_token_hash=$2,refresh_version=refresh_version+1,last_used_at=now() WHERE id=$1",
        [id, hash],
      ),
    revoke: (id: string) =>
      db.query(
        "UPDATE auth_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL",
        [id],
      ),
    revokeAll: (id: string) =>
      db.query(
        "UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [id],
      ),
    profile: (id: string, data: Row) =>
      db.query(
        'UPDATE users SET name=$2,phone=$3,"avatarUrl"=$4,updated_at=now() WHERE "idUser"=$1',
        [id, data.name, data.phone ?? null, data.avatarUrl ?? null],
      ),
    password: (id: string, hash: string) =>
      db.query(
        'UPDATE users SET password=$2,"resetOTP"=NULL,"resetOTPExpires"=NULL,updated_at=now() WHERE "idUser"=$1',
        [id, hash],
      ),
    users: (search: string, offset: number) =>
      db.query(
        'SELECT "idUser",name,email,status,locked_at,"createdAt" FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY "createdAt" DESC,"idUser" LIMIT 50 OFFSET $2',
        [`%${search}%`, offset],
      ),
    status: (id: string, status: string, locked: boolean, reason: string) =>
      db.query(
        'UPDATE users SET status=$2,locked_at=CASE WHEN $3 THEN now() ELSE NULL END,lock_reason=CASE WHEN $3 THEN $4 ELSE NULL END,updated_at=now() WHERE "idUser"=$1',
        [id, status, locked, reason],
      ),
    application: async (id: string) =>
      (
        await db.query(
          "SELECT * FROM organizer_applications WHERE id=$1 FOR UPDATE",
          [id],
        )
      )[0],
    applications: (user: string | null, offset = 0) =>
      db.query(
        "SELECT * FROM organizer_applications WHERE ($1::uuid IS NULL OR user_id=$1) ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        [user, offset],
      ),
    apply: (id: string, d: Row) =>
      db.query(
        "INSERT INTO organizer_applications(id,user_id,organization_name,contact_name,contact_email,contact_phone,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          randomUUID(),
          id,
          d.organizationName,
          d.contactName,
          d.contactEmail,
          d.contactPhone,
          d.description,
        ],
      ),
    review: (id: string, reviewer: string, approve: boolean, reason: string) =>
      db.query(
        "UPDATE organizer_applications SET status=$2,reviewed_by=$3,reviewed_at=now(),rejection_reason=$4 WHERE id=$1",
        [
          id,
          approve ? "APPROVED" : "REJECTED",
          reviewer,
          approve ? null : reason,
        ],
      ),
    reset: async (id: string) =>
      (
        await db.query(
          "SELECT * FROM password_reset_challenges WHERE user_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL FOR UPDATE",
          [id],
        )
      )[0],
    newReset: async (id: string, hash: string) => {
      await db.query(
        "UPDATE password_reset_challenges SET invalidated_at=now() WHERE user_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL",
        [id],
      );
      await db.query(
        "INSERT INTO password_reset_challenges(id,user_id,otp_hash,expires_at) VALUES($1,$2,$3,now()+interval '5 minutes')",
        [randomUUID(), id, hash],
      );
    },
    failedReset: (id: string) =>
      db.query(
        "UPDATE password_reset_challenges SET failed_attempts=failed_attempts+1 WHERE id=$1 AND failed_attempts<5",
        [id],
      ),
    consumeReset: (id: string) =>
      db.query(
        "UPDATE password_reset_challenges SET consumed_at=now() WHERE id=$1",
        [id],
      ),
    summary: async () =>
      (
        await db.query(
          'SELECT count(*) AS users,count(*) FILTER (WHERE EXISTS (SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=users."idUser" AND r.code=\'ORGANIZER\')) AS organizers FROM users',
        )
      )[0],
  };
}
