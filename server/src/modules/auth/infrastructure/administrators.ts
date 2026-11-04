import type { Store } from "../../../contracts/core";

const fields = `u."idUser",u.name,u.email,u.phone,u.status,u.locked_at,u.lock_reason,u.updated_at::text AS updated_at`;
const isAdmin = `EXISTS (SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=u."idUser" AND r.code='ADMIN')`;

export function administratorStore(db: Store) {
  return {
    // All C12 mutations serialize on the same existing role row, then lock users.
    lock: () =>
      db.query(`SELECT "idRole" FROM roles WHERE code='ADMIN' FOR UPDATE`),
    list: (q: string, limit: number, offset: number) =>
      db.query(
        `SELECT ${fields} FROM users u WHERE ${isAdmin}
       AND ($1::text='' OR u.name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u."createdAt",u."idUser" LIMIT $3 OFFSET $4`,
        [q, `%${q.replace(/[\\%_]/g, "\\$&")}%`, limit, offset],
      ),
    count: async (q: string) =>
      (
        await db.query(
          `SELECT count(*)::int AS total FROM users u WHERE ${isAdmin}
       AND ($1::text='' OR u.name ILIKE $2 OR u.email ILIKE $2)`,
          [q, `%${q.replace(/[\\%_]/g, "\\$&")}%`],
        )
      )[0],
    detail: async (id: string) =>
      (
        await db.query(
          `SELECT ${fields} FROM users u WHERE u."idUser"=$1 AND ${isAdmin}`,
          [id],
        )
      )[0],
    activeManagers: () =>
      db.query(
        `SELECT u."idUser" FROM users u WHERE u.status='ACTIVE' AND u.locked_at IS NULL AND ${isAdmin}
       AND EXISTS (SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole"
       JOIN roles_permissions rp ON rp."idRole"=r."idRole"
       JOIN permissions p ON p."idPermission"=rp."idPermission"
       WHERE ur."idUser"=u."idUser" AND p.code='administrators.manage')`,
      ),
    catalog: () =>
      db.query(
        `SELECT r.code,r.name,p.code AS permission,p.name AS permission_name
       FROM roles r LEFT JOIN roles_permissions rp ON rp."idRole"=r."idRole"
       LEFT JOIN permissions p ON p."idPermission"=rp."idPermission"
       WHERE r.code IN ('ADMIN','ADMIN_MANAGER') ORDER BY r.code,p.code`,
      ),
    revokeRole: (id: string, code: string) =>
      db.query(
        `DELETE FROM users_roles WHERE "idUser"=$1 AND "idRole" IN (SELECT "idRole" FROM roles WHERE code=$2)`,
        [id, code],
      ),
    touch: (id: string) =>
      db.query(`UPDATE users SET updated_at=now() WHERE "idUser"=$1`, [id]),
  };
}
