import { createHash } from "node:crypto";
import {
  ensure,
  role,
  type Principal,
  type Row,
  type Store,
  type UnitOfWork,
} from "../../contracts/core";
import { authStore } from "./infrastructure/store";
import { administratorStore } from "./infrastructure/administrators";

export function createAdministrators(db: Store, uow: UnitOfWork) {
  const repo = authStore(db);
  const admins = administratorStore(db);
  async function dto(user: Row) {
    const roles = (await repo.roles(user.idUser))
      .map((r) => String(r.code))
      .sort();
    const permissions = (await repo.permissions(user.idUser))
      .map((r) => String(r.code))
      .sort();
    return {
      id: String(user.idUser),
      name: String(user.name),
      email: String(user.email),
      phone: user.phone as string | null,
      status: String(user.status),
      locked: Boolean(user.locked_at),
      lockReason: user.lock_reason as string | null,
      roles,
      permissions,
      manager: permissions.includes("administrators.manage"),
      version: createHash("sha256")
        .update(
          JSON.stringify([
            user.updated_at,
            user.status,
            user.locked_at,
            user.lock_reason,
            roles,
            permissions,
          ]),
        )
        .digest("hex"),
    };
  }
  async function authorize(p: Principal) {
    // Re-read after acquiring the mutation lock: the request principal may be stale.
    const actor = await repo.user(p.userId);
    const roles = (await repo.roles(p.userId)).map((r) => r.code);
    const permissions = (await repo.permissions(p.userId)).map((r) => r.code);
    ensure(
      actor?.status === "ACTIVE" &&
        !actor.locked_at &&
        roles.includes("ADMIN") &&
        permissions.includes("administrators.manage"),
      "FORBIDDEN",
      "Bạn không có quyền quản lý quản trị viên.",
      403,
    );
  }
  const detail = async (p: Principal, id: string) => {
    role(p, ["ADMIN"]);
    const user = await admins.detail(id);
    ensure(user, "NOT_FOUND", "Không tìm thấy quản trị viên.", 404);
    return dto(user);
  };
  return {
    administratorDetail: detail,
    administratorCatalog: async (p: Principal) => {
      role(p, ["ADMIN"]);
      const rows = await admins.catalog();
      const roles = [...new Set(rows.map((r) => String(r.code)))].map(
        (code) => ({
          code,
          name: String(rows.find((r) => r.code === code)!.name),
          permissions: rows
            .filter((r) => r.code === code && r.permission)
            .map((r) => ({
              code: String(r.permission),
              name: String(r.permission_name),
            })),
        }),
      );
      return {
        roles,
        canManage: p.permissions.includes("administrators.manage"),
      };
    },
    administrators: async (
      p: Principal,
      q: string,
      page: number,
      limit: number,
    ) => {
      role(p, ["ADMIN"]);
      const rows = await admins.list(q, limit, page * limit);
      const count = await admins.count(q);
      const total = Number(count.total);
      return {
        items: await Promise.all(rows.map(dto)),
        pagination: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    grantAdministrator: (p: Principal, email: string, manager: boolean) =>
      uow.run(async () => {
        await admins.lock();
        await authorize(p);
        const user = await repo.byEmail(email);
        ensure(
          user,
          "NOT_FOUND",
          "Email phải thuộc tài khoản đã đăng ký.",
          404,
        );
        await repo.lockUser(user.idUser);
        const current = await repo.user(user.idUser);
        ensure(
          current?.status === "ACTIVE" && !current.locked_at,
          "ACCOUNT_DISABLED",
          "Tài khoản nhận quyền phải đang hoạt động.",
          409,
        );
        ensure(
          !(await repo.roles(user.idUser)).some((r) => r.code === "ADMIN"),
          "ALREADY_ADMIN",
          "Tài khoản đã là quản trị viên. Hãy dùng chức năng chỉnh sửa.",
          409,
        );
        const catalog = await admins.catalog();
        ensure(
          catalog.some((r) => r.code === "ADMIN_MANAGER"),
          "ADMIN_SETUP_REQUIRED",
          "Chưa áp dụng migration phân quyền quản trị.",
          503,
        );
        await repo.grant(user.idUser, "ADMIN");
        if (manager) await repo.grant(user.idUser, "ADMIN_MANAGER");
        else await admins.revokeRole(user.idUser, "ADMIN_MANAGER");
        await admins.touch(user.idUser);
        await repo.revokeAll(user.idUser);
        return detail(p, user.idUser);
      }),
    updateAdministrator: (
      p: Principal,
      id: string,
      input: {
        version: string;
        admin: boolean;
        manager: boolean;
        locked: boolean;
        reason: string;
      },
    ) =>
      uow.run(async () => {
        await admins.lock();
        await authorize(p);
        await repo.lockUser(id);
        const current = await detail(p, id);
        ensure(
          current.version === input.version,
          "ADMIN_CONFLICT",
          "Thông tin đã thay đổi. Tải lại trước khi lưu.",
          409,
        );
        ensure(
          id !== p.userId,
          "SELF_ADMIN_CHANGE",
          "Không thể thay đổi quyền hoặc khóa chính mình.",
          400,
        );
        ensure(
          input.admin || !input.manager,
          "INVALID_ADMIN_ROLE",
          "Quyền quản lý cần vai trò ADMIN.",
          400,
        );
        const managers = await admins.activeManagers();
        const remainsManager =
          input.admin &&
          input.manager &&
          !input.locked &&
          current.status === "ACTIVE";
        ensure(
          !managers.some((u) => u.idUser === id) ||
            remainsManager ||
            managers.length > 1,
          "LAST_ADMIN_MANAGER",
          "Phải giữ ít nhất một quản trị viên quản lý đang hoạt động.",
          409,
        );
        if (!input.admin) await admins.revokeRole(id, "ADMIN");
        if (!input.manager || !input.admin)
          await admins.revokeRole(id, "ADMIN_MANAGER");
        else await repo.grant(id, "ADMIN_MANAGER");
        await repo.status(
          id,
          input.locked ? "INACTIVE" : "ACTIVE",
          input.locked,
          input.reason,
        );
        await repo.revokeAll(id);
        return {
          id,
          admin: input.admin,
          manager: input.manager,
          locked: input.locked,
        };
      }),
  };
}
