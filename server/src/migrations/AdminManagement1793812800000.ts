import { randomUUID } from "node:crypto";
import type { MigrationInterface, QueryRunner } from "typeorm";

export class AdminManagement1793812800000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `INSERT INTO roles("idRole",code,name,"isSystem") VALUES($1,'ADMIN_MANAGER','Quản lý quản trị viên',true) ON CONFLICT(code) DO NOTHING`,
      [randomUUID()],
    );
    await q.query(
      `INSERT INTO permissions("idPermission",code,name) VALUES($1,'administrators.manage','Cấp quyền và quản lý quản trị viên') ON CONFLICT(code) DO NOTHING`,
      [randomUUID()],
    );
    await q.query(
      `INSERT INTO roles_permissions("idRole","idPermission") SELECT r."idRole",p."idPermission" FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN_MANAGER' AND p.code='administrators.manage' ON CONFLICT DO NOTHING`,
    );
    // Preserve management access for existing active administrators at the one-time rollout.
    await q.query(`INSERT INTO users_roles("idUser","idRole")
      SELECT u."idUser",manager."idRole" FROM users u CROSS JOIN roles manager
      WHERE manager.code='ADMIN_MANAGER' AND u.status='ACTIVE' AND u.locked_at IS NULL
      AND EXISTS(SELECT 1 FROM users_roles ur JOIN roles r ON r."idRole"=ur."idRole" WHERE ur."idUser"=u."idUser" AND r.code='ADMIN')
      ON CONFLICT DO NOTHING`);
  }
  async down() {
    throw new Error(
      "Administrative permission history must be preserved. Use a reviewed forward migration.",
    );
  }
}
