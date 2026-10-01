import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, createHmac, randomInt, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { authStore } from "./infrastructure/store";
import {
  ensure,
  role,
  type Store,
  type UnitOfWork,
  type Principal,
  type Row,
} from "../../contracts/core";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export function createAuth(db: Store, uow: UnitOfWork, secret: string) {
  const repo = authStore(db);
  const otpHash = (email: string, otp: string) =>
    createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
  async function profile(id: string) {
    const user = await repo.user(id);
    ensure(user, "NOT_FOUND", "Không tìm thấy tài khoản.", 404);
    return {
      idUser: id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      roles: (await repo.roles(id)).map((r) => r.code),
      permissions: (await repo.permissions(id)).map((r) => r.code),
    };
  }
  function active(user: Row | undefined) {
    ensure(
      user && user.status === "ACTIVE" && !user.locked_at,
      "ACCOUNT_DISABLED",
      "Tài khoản không hoạt động hoặc đã bị khóa.",
      403,
    );
  }
  const token = (id: string, sid: string) =>
    jwt.sign({ userId: id, sid, jti: randomUUID() }, secret, {
      expiresIn: "15m",
    });
  async function session(id: string) {
    const sid = randomUUID(),
      refresh = `${sid}.${randomUUID()}.${randomUUID()}`;
    await repo.newSession(sid, id, sha(refresh));
    return {
      user: await profile(id),
      accessToken: token(id, sid),
      refreshToken: refresh,
    };
  }
  return {
    profile,
    async register(d: Row) {
      const hash = await bcrypt.hash(d.password, 12);
      return uow.run(async () => {
        const user = await repo.create({ ...d, password: hash });
        await repo.grant(user.idUser, "USER");
        return session(user.idUser);
      });
    },
    async login(email: string, password: string) {
      const user = await repo.byEmail(email);
      ensure(
        user && (await bcrypt.compare(password, user.password)),
        "INVALID_LOGIN",
        "Email hoặc mật khẩu không chính xác.",
        401,
      );
      return uow.run(async () => {
        await repo.lockUser(user.idUser);
        active(await repo.user(user.idUser));
        return session(user.idUser);
      });
    },
    async resolve(access: string): Promise<Principal> {
      let claims: jwt.JwtPayload;
      try {
        claims = jwt.verify(access, secret) as jwt.JwtPayload;
      } catch {
        throw Object.assign(new Error("Phiên đăng nhập không hợp lệ."), {
          status: 401,
          code: "INVALID_SESSION",
        });
      }
      ensure(
        typeof claims.userId === "string" && typeof claims.sid === "string",
        "INVALID_SESSION",
        "Phiên không hợp lệ.",
        401,
      );
      const user = await repo.user(claims.userId),
        s = await repo.session(claims.sid);
      active(user);
      ensure(
        s &&
          s.user_id === claims.userId &&
          !s.revoked_at &&
          new Date(s.expires_at) > new Date(),
        "INVALID_SESSION",
        "Phiên đã hết hạn.",
        401,
      );
      return {
        userId: claims.userId,
        sessionId: claims.sid,
        roles: (await repo.roles(claims.userId)).map((r) => r.code),
        permissions: (await repo.permissions(claims.userId)).map((r) => r.code),
      };
    },
    async refresh(value: string) {
      const sid = value.split(".")[0];
      ensure(
        /^[0-9a-f-]{36}$/.test(sid),
        "INVALID_SESSION",
        "Phiên không hợp lệ.",
        401,
      );
      const initial = await repo.session(sid);
      ensure(initial, "INVALID_SESSION", "Phiên không hợp lệ.", 401);
      const result = await uow.run(async () => {
        await repo.lockUser(initial.user_id);
        const s = await repo.session(sid, true);
        active(await repo.user(initial.user_id));
        if (!s || s.revoked_at || new Date(s.expires_at) <= new Date())
          return null;
        if (s.refresh_token_hash !== sha(value)) {
          await repo.revoke(sid);
          return null;
        }
        const refresh = `${sid}.${randomUUID()}.${randomUUID()}`;
        await repo.rotate(sid, sha(refresh));
        return { accessToken: token(s.user_id, sid), refreshToken: refresh };
      });
      ensure(
        result,
        "INVALID_SESSION",
        "Phiên đã hết hạn hoặc được sử dụng lại.",
        401,
      );
      return result;
    },
    logout: (p: Principal) => repo.revoke(p.sessionId),
    async update(p: Principal, d: Row) {
      await repo.profile(p.userId, d);
      return profile(p.userId);
    },
    async changePassword(p: Principal, current: string, next: string) {
      await uow.run(async () => {
        await repo.lockUser(p.userId);
        const user = await repo.user(p.userId);
        ensure(
          await bcrypt.compare(current, user.password),
          "INVALID_PASSWORD",
          "Mật khẩu hiện tại không đúng.",
          400,
        );
        await repo.password(p.userId, await bcrypt.hash(next, 12));
        await repo.revokeAll(p.userId);
      });
    },
    async forgot(email: string) {
      ensure(
        process.env.SMTP_HOST,
        "EMAIL_NOT_CONFIGURED",
        "Chưa cấu hình dịch vụ email.",
        503,
      );
      const user = await repo.byEmail(email);
      if (!user) return;
      const otp = String(randomInt(100000, 1000000));
      await uow.run(async () => {
        await repo.lockUser(user.idUser);
        await repo.newReset(user.idUser, otpHash(email, otp));
      });
      await nodemailer
        .createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        })
        .sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: "Đặt lại mật khẩu EventHub",
          text: `Mã xác nhận: ${otp}. Hết hạn sau 5 phút.`,
        });
    },
    async reset(email: string, otp: string, password?: string) {
      const user = await repo.byEmail(email);
      ensure(user, "INVALID_OTP", "Mã xác nhận không hợp lệ.", 400);
      const valid = await uow.run(async () => {
        await repo.lockUser(user.idUser);
        const r = await repo.reset(user.idUser);
        if (
          !r ||
          r.failed_attempts >= 5 ||
          new Date(r.expires_at) <= new Date()
        )
          return false;
        if (r.otp_hash !== otpHash(email, otp)) {
          await repo.failedReset(r.id);
          return false;
        }
        if (password) {
          await repo.password(user.idUser, await bcrypt.hash(password, 12));
          await repo.consumeReset(r.id);
          await repo.revokeAll(user.idUser);
        }
        return true;
      });
      ensure(
        valid,
        "INVALID_OTP",
        "Mã xác nhận không hợp lệ hoặc đã hết hạn.",
        400,
      );
      return { valid: true };
    },
    apply: (p: Principal, d: Row) =>
      uow.run(async () => {
        await repo.lockUser(p.userId);
        role(p, ["USER"]);
        ensure(
          !p.roles.includes("ORGANIZER"),
          "ALREADY_ORGANIZER",
          "Bạn đã là Organizer.",
        );
        return (await repo.apply(p.userId, d))[0];
      }),
    applications: (p: Principal, admin = false, page = 0) => {
      if (admin) role(p, ["ADMIN"]);
      return repo.applications(admin ? null : p.userId, page * 50);
    },
    review: (p: Principal, id: string, approve: boolean, reason: string) =>
      uow.run(async () => {
        role(p, ["ADMIN"]);
        const app = await repo.application(id);
        ensure(app, "NOT_FOUND", "Không tìm thấy yêu cầu.", 404);
        ensure(
          app.status === "PENDING",
          "ALREADY_REVIEWED",
          "Yêu cầu đã được xử lý.",
        );
        await repo.review(id, p.userId, approve, reason);
        if (approve) await repo.grant(app.user_id, "ORGANIZER");
      }),
    users: (p: Principal, q: string, page: number) => {
      role(p, ["ADMIN"]);
      return repo.users(q, page * 50);
    },
    status: (p: Principal, id: string, d: Row) =>
      uow.run(async () => {
        role(p, ["ADMIN"]);
        ensure(id !== p.userId, "SELF_LOCK", "Không thể khóa chính mình.", 400);
        await repo.lockUser(id);
        await repo.status(id, d.status, d.locked, d.reason);
        if (d.status === "INACTIVE" || d.locked) await repo.revokeAll(id);
      }),
    publicOrganizer: async (id: string) => {
      const u = await profile(id);
      return { name: u.name, avatarUrl: u.avatarUrl };
    },
    summary: repo.summary,
  };
}
export type Auth = ReturnType<typeof createAuth>;
