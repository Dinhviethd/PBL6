import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { z, ZodError } from "zod";
import QRCode from "qrcode";
import multer from "multer";
import { saveImage, uploadDirectory } from "./platform/media";
import { createDatabase } from "./platform/database";
import { createAuth } from "./modules/auth/public";
import { createEvents } from "./modules/event/public";
import { createOrders } from "./modules/order/public";
import { createPayments, demoProvider } from "./modules/payment/public";
import { createAudit } from "./modules/audit/public";
import { createBooking } from "./workflows/booking";
import { ensure, role, type Row, type Principal } from "./contracts/core";
const uuid = z.string().uuid(),
  text = z.string().trim().min(1),
  date = z.string().datetime({ offset: true }),
  password = z.string().min(8).max(72),
  email = z.string().trim().toLowerCase().email();
const imageUrl = z
  .string()
  .refine(
    (s) => /^https?:\/\//.test(s) || /^\/uploads\/[0-9a-f-]+\.webp$/.test(s),
    "Đường dẫn ảnh không hợp lệ.",
  );
const profileSchema = z.object({
  name: text.max(150),
  phone: z.string().max(30).optional(),
  avatarUrl: imageUrl.optional(),
});
const eventSchema = z
  .object({
    categoryId: uuid,
    slug: text.regex(/^[a-z0-9-]+$/).max(220),
    title: text.max(200),
    description: text.max(20000),
    coverImageUrl: imageUrl.optional(),
    venueName: text.max(200),
    address: text.max(1000),
    cityCode: text.max(32),
    startsAt: date,
    endsAt: date,
    checkinOpensAt: date,
    checkinClosesAt: date,
  })
  .refine(
    (d) =>
      new Date(d.startsAt) < new Date(d.endsAt) &&
      new Date(d.checkinOpensAt) < new Date(d.checkinClosesAt) &&
      new Date(d.checkinClosesAt) <= new Date(d.endsAt),
    "Thời gian không hợp lệ.",
  );
const typeSchema = z
  .object({
    name: text.max(100),
    description: z.string().max(2000).optional(),
    price: z.coerce.string().regex(/^[1-9]\d{0,14}$/),
    capacity: z.coerce.number().int().min(1).max(1000000),
    saleStartsAt: date,
    saleEndsAt: date,
  })
  .refine(
    (d) => new Date(d.saleStartsAt) < new Date(d.saleEndsAt),
    "Thời gian bán không hợp lệ.",
  );
const decision = z
  .object({
    approve: z.boolean(),
    reason: z.string().trim().max(2000).default(""),
  })
  .refine((d) => d.approve || d.reason.length > 0, "Cần nhập lý do từ chối.");
const page = (r: Request) =>
  z.coerce.number().int().min(0).max(10000).default(0).parse(r.query.page);
const query = (r: Request, k: string) =>
  z.string().max(200).optional().parse(r.query[k]) ?? "";
const id = (r: Request, k = "id") => uuid.parse(r.params[k]);
const who = (r: Response) => r.locals.principal as Principal;

export function createApplication(config: {
  databaseUrl: string;
  secret: string;
  qrSecret: string;
  demo?: boolean;
  clientUrl?: string;
}) {
  ensure(
    config.secret.length >= 32 && config.qrSecret.length >= 32,
    "CONFIG",
    "JWT_ACCESS_SECRET và QR_SECRET phải có ít nhất 32 ký tự.",
    500,
  );
  ensure(
    !(config.demo && process.env.NODE_ENV === "production"),
    "CONFIG",
    "Không được bật demo trong production.",
    500,
  );
  const db = createDatabase(config.databaseUrl),
    uow = db.uow,
    auth = createAuth(db.owner("auth"), uow, config.secret),
    events = createEvents(db.owner("event"));
  const orders = createOrders(db.owner("order"), config.qrSecret),
    payments = createPayments(
      db.owner("payment"),
      demoProvider(config.demo === true),
    ),
    audit = createAudit(db.owner("audit"));
  const booking = createBooking(auth, events, orders, payments, audit, uow),
    app = express(),
    api = express.Router();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin: config.clientUrl ?? "http://localhost:5173",
      credentials: true,
    }),
    express.json({ limit: "1mb" }),
    cookieParser(),
  );
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  const limits = new Map<string, { n: number; until: number }>();
  app.use("/api", (req, res, next) => {
    if (req.method === "GET") return next();
    const credentialRequest = /^\/auth\/(login|register|forgot-password|verify-otp|reset-password)$/.test(req.path);
    const key = `${req.ip}:${credentialRequest ? "auth" : "write"}`,
      now = Date.now();
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    const e = limits.get(key);
    if (!e || e.until < now) {
      limits.set(key, { n: 1, until: now + 60000 });
      return next();
    }
    if (++e.n > (credentialRequest ? 20 : 120))
      return res
        .status(429)
        .json({ success: false, message: "Vui lòng thử lại sau một phút." });
    next();
  });
  const route =
    (fn: (req: Request, res: Response) => unknown) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((data) => {
          if (!res.headersSent) res.json({ success: true, data: data ?? null });
        })
        .catch(next);
    };
  const protect = (req: Request, res: Response, next: NextFunction) => {
    const b = req.headers.authorization;
    if (!b?.startsWith("Bearer "))
      return next(
        Object.assign(new Error("Vui lòng đăng nhập."), {
          status: 401,
          code: "UNAUTHORIZED",
        }),
      );
    auth
      .resolve(b.slice(7))
      .then((p) => {
        res.locals.principal = p;
        next();
      })
      .catch(next);
  };
  const loginResult = (res: Response, result: Row) => {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 7 * 86400000,
    });
    const { refreshToken: _, ...safe } = result;
    return safe;
  };
  api.get(
    "/health",
    route(async () => {
      await events.categories();
      return { status: "ok" };
    }),
  );
  api.get(
    "/config",
    route(() => ({ paymentMode: config.demo ? "demo" : "disabled" })),
  );
  api.post(
    "/auth/register",
    route(async (req, res) => {
      const d = z
        .object({
          name: text.max(150),
          email,
          password,
          confirmPassword: password,
          phone: z.string().max(30).optional(),
        })
        .refine((d) => d.password === d.confirmPassword, "Mật khẩu không khớp.")
        .parse(req.body);
      return loginResult(res, await auth.register(d));
    }),
  );
  api.post(
    "/auth/login",
    route(async (req, res) => {
      const d = z
        .object({ email, password: z.string().min(1).max(200) })
        .parse(req.body);
      return loginResult(res, await auth.login(d.email, d.password));
    }),
  );
  api.post(
    "/auth/refresh-token",
    route(async (req, res) => {
      ensure(
        !req.headers.origin ||
          req.headers.origin === (config.clientUrl ?? "http://localhost:5173"),
        "ORIGIN",
        "Origin không hợp lệ.",
        403,
      );
      return loginResult(
        res,
        await auth.refresh(text.parse(req.cookies.refreshToken)),
      );
    }),
  );
  api.post(
    "/auth/forgot-password",
    route(async (req) => {
      await auth.forgot(email.parse(req.body.email));
      return { message: "Nếu tài khoản tồn tại, mã xác nhận đã được gửi." };
    }),
  );
  api.post(
    "/auth/verify-otp",
    route((req) =>
      auth.reset(
        email.parse(req.body.email),
        z
          .string()
          .regex(/^\d{6}$/)
          .parse(req.body.otp),
      ),
    ),
  );
  api.post(
    "/auth/reset-password",
    route((req) => {
      const d = z
        .object({
          email,
          otp: z.string().regex(/^\d{6}$/),
          newPassword: password,
          confirmPassword: password,
        })
        .refine((d) => d.newPassword === d.confirmPassword)
        .parse(req.body);
      return auth.reset(d.email, d.otp, d.newPassword);
    }),
  );
  api.get(
    "/auth/me",
    protect,
    route((_q, res) => auth.profile(who(res).userId)),
  );
  api.post(
    "/auth/logout",
    protect,
    route(async (_q, res) => {
      await auth.logout(who(res));
      res.clearCookie("refreshToken", { path: "/api/auth" });
    }),
  );
  api.patch(
    "/me",
    protect,
    route((req, res) => auth.update(who(res), profileSchema.parse(req.body))),
  );
  api.post(
    "/me/password",
    protect,
    route((req, res) => {
      const d = z
        .object({ currentPassword: text, newPassword: password })
        .parse(req.body);
      return auth.changePassword(who(res), d.currentPassword, d.newPassword);
    }),
  );
  api.get(
    "/categories",
    route(() => events.categories()),
  );
  api.get(
    "/events",
    route(async (req) => {
      const min = z
          .string()
          .regex(/^\d+$/)
          .default("0")
          .parse(req.query.minPrice),
        max = z
          .string()
          .regex(/^\d+$/)
          .default("9007199254740991")
          .parse(req.query.maxPrice);
      const ids = (await orders.matchingEvents(min, max)).map(
        (t) => t.event_id,
      );
      const rows = await events.list({
        status: "PUBLISHED",
        q: query(req, "q"),
        category: req.query.category ? uuid.parse(req.query.category) : null,
        city: query(req, "city") || null,
        from: req.query.from ? date.parse(req.query.from) : null,
        to: req.query.to ? date.parse(req.query.to) : null,
        limit: 24,
        offset: page(req) * 24,
        ids,
      });
      const offerings = await orders.offerings(rows.map((e) => e.id));
      return {
        items: rows.map((e) => ({
          ...e,
          priceFrom:
            offerings.find((t) => t.event_id === e.id)?.price_amount ?? "0",
        })),
        total: Number(rows[0]?.total_results ?? 0),
      };
    }),
  );
  api.get(
    "/events/:slug",
    route(async (req) => {
      const e = await events.publicOne(String(req.params.slug));
      return {
        ...e,
        ticketTypes: (await orders.types(e.id)).filter((t) => !t.archived_at),
        organizer: await auth.publicOrganizer(e.organizer_id),
      };
    }),
  );
  api.get(
    "/me/organizer-applications",
    protect,
    route((req, res) => auth.applications(who(res), false, page(req))),
  );
  api.post(
    "/me/organizer-applications",
    protect,
    route((req, res) =>
      auth.apply(
        who(res),
        z
          .object({
            organizationName: text.max(200),
            contactName: text.max(150),
            contactEmail: email,
            contactPhone: text.max(30),
            description: text.max(4000),
          })
          .parse(req.body),
      ),
    ),
  );
  api.get(
    "/organizer/events",
    protect,
    route((req, res) => {
      role(who(res), ["ORGANIZER", "ADMIN"]);
      return events.list({ owner: who(res).userId, offset: page(req) * 50 });
    }),
  );
  api.post(
    "/organizer/events",
    protect,
    route((req, res) =>
      booking.saveEvent(who(res), eventSchema.parse(req.body)),
    ),
  );
  api.get(
    "/organizer/events/:id",
    protect,
    route(async (req, res) => {
      const e = await events.guard(id(req), who(res));
      return {
        ...e,
        ticketTypes: await orders.types(e.id),
        reviews: await events.reviews(e.id),
      };
    }),
  );
  api.patch(
    "/organizer/events/:id",
    protect,
    route((req, res) =>
      booking.saveEvent(who(res), eventSchema.parse(req.body), id(req)),
    ),
  );
  api.post(
    "/organizer/events/:id/submit",
    protect,
    route((req, res) => booking.submit(who(res), id(req))),
  );
  api.post(
    "/organizer/events/:id/pause",
    protect,
    route((req, res) =>
      booking.pause(who(res), id(req), z.boolean().parse(req.body.paused)),
    ),
  );
  api.post(
    "/organizer/events/:id/cancel",
    protect,
    route((req, res) =>
      booking.cancelEvent(
        who(res),
        id(req),
        text.max(2000).parse(req.body.reason),
      ),
    ),
  );
  api.post(
    "/organizer/events/:id/ticket-types",
    protect,
    route((req, res) =>
      booking.configureType(who(res), id(req), typeSchema.parse(req.body)),
    ),
  );
  api.patch(
    "/organizer/events/:id/ticket-types/:typeId",
    protect,
    route((req, res) =>
      booking.configureType(
        who(res),
        id(req),
        typeSchema.parse(req.body),
        id(req, "typeId"),
      ),
    ),
  );
  api.delete(
    "/organizer/events/:id/ticket-types/:typeId",
    protect,
    route((req, res) =>
      booking.archiveType(who(res), id(req), id(req, "typeId")),
    ),
  );
  api.post(
    "/orders",
    protect,
    route((req, res) => {
      const d = z
        .object({
          eventId: uuid,
          items: z
            .array(
              z.object({
                ticketTypeId: uuid,
                quantity: z.number().int().min(1).max(10),
              }),
            )
            .min(1)
            .max(10),
        })
        .parse(req.body);
      return booking.createOrder(
        who(res),
        d.eventId,
        d.items,
        text.max(128).parse(req.headers["idempotency-key"]),
      );
    }),
  );
  api.get(
    "/me/orders",
    protect,
    route((req, res) =>
      orders.list(
        who(res).userId,
        null,
        page(req) * 50,
        query(req, "status") || null,
        query(req, "q"),
        req.query.from ? date.parse(req.query.from) : null,
        req.query.to ? date.parse(req.query.to) : null,
      ),
    ),
  );
  api.get(
    "/me/orders/:id",
    protect,
    route((req, res) => booking.detail(who(res), id(req))),
  );
  api.post(
    "/orders/:id/payments",
    protect,
    route((req, res) => booking.startPayment(who(res), id(req))),
  );
  api.post(
    "/orders/:id/cancel",
    protect,
    route((req, res) => booking.cancelOrder(who(res), id(req))),
  );
  api.post(
    "/payments/:id/demo",
    protect,
    route((req, res) =>
      booking.demoPayment(
        who(res),
        id(req),
        z.boolean().parse(req.body.success),
      ),
    ),
  );
  api.get(
    "/me/tickets",
    protect,
    route((req, res) => orders.tickets(who(res).userId, null, page(req) * 50)),
  );
  api.get(
    "/me/tickets/:id",
    protect,
    route(async (req, res) => {
      const t = await orders.qr(who(res), id(req));
      const { token, ...safe } = t;
      return {
        ...safe,
        qrImage: await QRCode.toDataURL(token, { width: 320, margin: 2 }),
      };
    }),
  );
  api.get(
    "/organizer/events/:id/orders",
    protect,
    route(async (req, res) => {
      await events.guard(id(req), who(res));
      return orders.list(
        null,
        id(req),
        page(req) * 50,
        query(req, "status") || null,
        query(req, "q"),
      );
    }),
  );
  api.get(
    "/organizer/events/:id/attendees",
    protect,
    route(async (req, res) => {
      await events.guard(id(req), who(res));
      return orders.tickets("", id(req), page(req) * 50, query(req, "q"));
    }),
  );
  api.get(
    "/organizer/events/:id/stats",
    protect,
    route((req, res) => booking.overview(who(res), id(req))),
  );
  api.post(
    "/organizer/events/:id/checkins",
    protect,
    route((req, res) =>
      booking.scan(who(res), id(req), text.max(256).parse(req.body.code)),
    ),
  );
  api.use("/admin", protect, (_req, res, next) => {
    try {
      role(who(res), ["ADMIN"]);
      next();
    } catch (e) {
      next(e);
    }
  });
  api.get(
    "/admin/stats",
    route((_q, res) => booking.overview(who(res))),
  );
  api.get(
    "/admin/users",
    route((req, res) => auth.users(who(res), query(req, "q"), page(req))),
  );
  api.patch(
    "/admin/users/:id",
    route((req, res) =>
      uow.run(async () => {
        await auth.status(
          who(res),
          id(req),
          z
            .object({
              status: z.enum(["ACTIVE", "INACTIVE"]),
              locked: z.boolean(),
              reason: text.max(2000),
            })
            .parse(req.body),
        );
        await audit.append(who(res), "user.status", "user", id(req));
      }),
    ),
  );
  api.get(
    "/admin/organizer-applications",
    route((req, res) => auth.applications(who(res), true, page(req))),
  );
  api.post(
    "/admin/organizer-applications/:id/review",
    route((req, res) =>
      uow.run(async () => {
        const d = decision.parse(req.body);
        await auth.review(who(res), id(req), d.approve, d.reason);
        await audit.append(
          who(res),
          "organizer.reviewed",
          "application",
          id(req),
          d,
        );
      }),
    ),
  );
  api.get(
    "/admin/events",
    route((req) =>
      events.list({
        status: query(req, "status") || null,
        offset: page(req) * 50,
      }),
    ),
  );
  api.post(
    "/admin/events/:id/review",
    route((req, res) => {
      const d = decision.parse(req.body);
      return booking.review(who(res), id(req), d.approve, d.reason);
    }),
  );
  const categorySchema = z.object({
    name: text.max(100),
    slug: text.regex(/^[a-z0-9-]+$/).max(120),
  });
  api.post(
    "/admin/categories",
    route(
      async (req) =>
        (await events.saveCategory(categorySchema.parse(req.body)))[0],
    ),
  );
  api.patch(
    "/admin/categories/:id",
    route(
      async (req) =>
        (await events.saveCategory(categorySchema.parse(req.body), id(req)))[0],
    ),
  );
  api.delete(
    "/admin/categories/:id",
    route((req) => events.archiveCategory(id(req))),
  );
  api.get(
    "/admin/payments",
    route((req) =>
      payments.list(
        query(req, "status") || null,
        page(req) * 50,
        req.query.from ? date.parse(req.query.from) : null,
        req.query.to ? date.parse(req.query.to) : null,
        query(req, "q"),
      ),
    ),
  );
  api.post(
    "/media",
    protect,
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }).single("image"),
    route((req) => {
      ensure(req.file, "NO_IMAGE", "Cần chọn ảnh.", 400);
      return saveImage(req.file.buffer);
    }),
  );
  app.use(
    "/uploads",
    express.static(uploadDirectory, { dotfiles: "deny", fallthrough: false }),
  );
  app.use("/api", api);
  app.use("/api", (_req, res) =>
    res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "API không tồn tại.",
    }),
  );
  const publicPath =
    process.env.STATIC_DIR ?? path.resolve(__dirname, "../../client/dist");
  app.use(express.static(publicPath));
  app.get(/.*/, (_req, res, next) =>
    res.sendFile(path.join(publicPath, "index.html"), (err) => {
      if (err) next(err);
    }),
  );
  app.use((error: Row, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      error instanceof multer.MulterError
        ? error.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400
        : error instanceof ZodError
          ? 400
          : error.code === "23505" || error.code === "23514"
            ? 409
            : (error.status ?? 500);
    res.status(status).json({
      success: false,
      code: error.code ?? (status === 400 ? "VALIDATION" : "INTERNAL"),
      message:
        error instanceof ZodError
          ? error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          : status === 500
            ? "Có lỗi hệ thống."
            : error.code === "23505"
              ? "Dữ liệu đã tồn tại hoặc yêu cầu đang được xử lý."
              : error.message,
    });
    if (status === 500)
      console.error("Request failed", error.code ?? error.name, error.message);
  });
  return {
    app,
    start: db.start,
    close: db.close,
    booking,
    auth,
    events,
    orders,
    payments,
    uow,
  };
}
