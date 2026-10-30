import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { parseSepayWebhook, verifySepayHmac } from "./modules/payment/public";
import { z, ZodError } from "zod";
import QRCode from "qrcode";
import multer from "multer";
import { saveImage, uploadDirectory } from "./platform/media";
import { createDatabase } from "./platform/database";
import { createAuth } from "./modules/auth/public";
import { createEvents } from "./modules/event/public";
import { createOrders } from "./modules/order/public";
import {
  createPayments,
  demoProvider,
  type PaymentProvider,
  createSepayPayments,
  createSepayReconciliation,
  createSepayV2Reconciler,
  type SepayConfig,
} from "./modules/payment/public";
import { createAudit } from "./modules/audit/public";
import { createNotifications } from "./modules/notification/public";
import { createBooking } from "./workflows/booking";
import { createSepayBooking } from "./workflows/sepay-booking";
import { createSepayWebhook } from "./workflows/sepay-webhook";
import { createWaitQueue } from "./workflows/wait-queue";
import { createOrderHistory } from "./workflows/order-history";
import { createOrderManager } from "./workflows/order-manager";
import { ensure, role, type Row, type Principal } from "./contracts/core";
const uuid = z.string().uuid(),
  text = z.string().trim().min(1),
  date = z.string().datetime({ offset: true }),
  password = z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Mật khẩu quá dài; hãy rút ngắn nếu dùng ký tự có dấu hoặc emoji.",
    ),
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
const registerSchema = z
  .object({
    name: text.max(150),
    email,
    password,
    confirmPassword: password,
    phone: z.string().max(30).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, "Mật khẩu không khớp.");
const loginSchema = z.object({ email, password: z.string().min(1).max(200) });
const eventSchema = z
  .object({
    categoryId: uuid,
    slug: text.regex(/^[a-z0-9-]+$/).max(220).optional(),
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
const pageSize = (r: Request) =>
  z.coerce.number().int().min(1).max(100).default(50).parse(r.query.limit);
const query = (r: Request, k: string) =>
  z.string().max(200).optional().parse(r.query[k]) ?? "";
const id = (r: Request, k = "id") => uuid.parse(r.params[k]);
const who = (r: Response) => r.locals.principal as Principal;

export function createApplication(config: {
  databaseUrl: string;
  secret: string;
  qrSecret: string;
  demo?: boolean;
  paymentProvider?: PaymentProvider;
  clientUrl?: string;
  clientOrigins?: string[];
  sepay?: SepayConfig;
  sepayApiV2SandboxToken?: string;
  sepayApiV2Token?: string;
  sepayAcceptNewPayments?: boolean;
  databaseSsl?: import("./platform/database").DatabaseTls | false;
}) {
  const clientOrigin = config.clientUrl ?? "http://localhost:5173";
  const allowedClientOrigins = new Set([clientOrigin, ...(config.clientOrigins ?? [])]);
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
  ensure(!(config.sepay?.environment === "live" && config.sepayApiV2SandboxToken), "SEPAY_CONFIG", "Sandbox token cannot be used for Live.", 500);
  const sepayToken = config.sepayApiV2Token ?? (config.sepay?.environment === "test" ? config.sepayApiV2SandboxToken : undefined);
  ensure(config.sepay?.environment !== "live" || (typeof sepayToken === "string" && sepayToken.trim().length >= 10), "SEPAY_CONFIG", "Live requires its own API v2 token.", 500);
  const db = createDatabase(config.databaseUrl, config.databaseSsl),
    uow = db.uow,
    auth = createAuth(db.owner("auth"), uow, config.secret),
    events = createEvents(db.owner("event"));
  const orders = createOrders(db.owner("order"), config.qrSecret),
    payments = createPayments(
      db.owner("payment"),
      config.paymentProvider ?? demoProvider(config.demo === true),
    ),
    audit = createAudit(db.owner("audit"));
  const notifications = createNotifications(db.owner("notification"));
  // SePay is opt-in and cannot run with an enabled legacy simulator in this process.
  ensure(!config.sepay || !payments.provider.enabled(), "SEPAY_LEGACY_MODE",
    "SePay local phải chạy riêng với provider cũ disabled.", 500);
  const sepayBooking = config.sepay ? createSepayBooking(orders, events, payments,
    createSepayPayments(db.owner("payment"), config.sepay), audit, uow) : null;
  const sepayStore = config.sepay ? createSepayPayments(db.owner("payment"), config.sepay) : null;
  const sepayWebhook = sepayStore ? createSepayWebhook(sepayStore,payments,orders,uow,notifications,audit) : null;
  const sepayAdmin = config.sepay ? createSepayReconciliation(db.owner("payment"),config.sepay) : null;
  const sepayV2 = config.sepay ? createSepayV2Reconciler(db.owner("payment"),config.sepay,sepayToken ?? "",undefined,db.exclusive) : null;
  const booking = createBooking(
      auth,
      events,
      orders,
      payments,
      audit,
      uow,
      notifications,
    ),
    orderManager = createOrderManager(events, orders, payments, db.snapshot),
    app = express(),
    api = express.Router();
  app.disable("x-powered-by");
  const waitQueue = createWaitQueue(
    auth,
    events,
    orders,
    notifications,
    uow,
    booking,
  );
  // Local ngrok agent is the only trusted forwarding hop.
  app.set("trust proxy", "loopback");
  ensure(
    !(payments.provider.enabled() && process.env.NODE_ENV === "production"),
    "CONFIG",
    "Thanh toán thử không được bật trong production.",
    500,
  );
  if (sepayWebhook) app.post("/api/payments/sepay/webhook", express.raw({type:"application/json",limit:"32kb"}), async (req,res,next)=>{
    try {
      const raw=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
      const headerCount=(name:string)=>req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===name).length;
      if(headerCount("x-sepay-timestamp")!==1||headerCount("x-sepay-signature")!==1||!verifySepayHmac(raw,req.header("X-SePay-Timestamp"),req.header("X-SePay-Signature"),config.sepay!.webhookSecret)) {
        res.status(401).json({success:false,message:"Unauthorized"});return;
      }
      const payload=parseSepayWebhook(raw);
      await sepayWebhook!.receive(payload);
      res.status(200).json({success:true});
    } catch(error) { next(error); }
  });
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, origin ? allowedClientOrigins.has(origin) : false),
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
    const credentialRequest =
      /^\/auth\/(mobile\/)?(login|register|forgot-password|verify-otp|reset-password)$/.test(
        req.path,
      );
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
  if (sepayBooking) {
    const polls = new Map<string, { count: number; until: number }>();
    api.post("/sepay/orders/:orderId/payment", protect, route(async (req, res) => {
      ensure(config.sepayAcceptNewPayments !== false, "SEPAY_MAINTENANCE", "Tạm dừng tạo thanh toán mới. Vui lòng thử lại sau.", 503);
      z.object({}).strict().parse(req.body ?? {});
      const result = await sepayBooking.start(who(res), id(req, "orderId"));
      res.status(result!.created ? 201 : 200);
      res.setHeader("Cache-Control", "no-store");
      return result!.data;
    }));
    api.get("/sepay/orders/:orderId/payment", protect, route((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const now = Date.now(), key = who(res).userId;
      for (const [user, value] of polls) if (value.until <= now) polls.delete(user);
      const limit = polls.get(key) ?? { count: 0, until: now + 60000 };
      ensure(++limit.count <= 30, "SEPAY_POLL_LIMIT", "Vui lòng giảm tần suất kiểm tra thanh toán.", 429);
      polls.set(key, limit);
      return sepayBooking.detail(who(res), id(req, "orderId"));
    }));
  }
  if (sepayAdmin && sepayWebhook) {
    api.post("/admin/sepay/reconcile",protect,route(async(req,res)=>{
      role(who(res),["ADMIN"]);
      const body=z.object({lookbackMinutes:z.number().int().min(5).max(1440).default(60)}).strict().parse(req.body ?? {});
      ensure(sepayToken,"SEPAY_V2_NOT_CONFIGURED","SePay API v2 token chưa được cấu hình.",503);
      res.setHeader("Cache-Control","no-store");
      // Reconcile performs read-only upstream calls and inserts/links transactions; each
      // database query remains within the local, owner-guarded store.
      return sepayV2!.reconcile(body.lookbackMinutes);
    }));
    api.get("/admin/sepay/transactions",protect,route((req,res)=>{
      role(who(res),["ADMIN"]);
      res.setHeader("Cache-Control","no-store");
      const status=req.query.status===undefined?null:z.enum(["RECEIVED","PROCESSING","PROCESSED","REVIEW","ERROR"]).parse(req.query.status);
      const filter=z.object({from:z.string().datetime({offset:true}).optional(),to:z.string().datetime({offset:true}).optional(),reference:z.string().trim().min(1).max(256).optional()}).parse(req.query);
      ensure(!filter.from||!filter.to||Date.parse(filter.from)<=Date.parse(filter.to),"SEPAY_FILTER","Khoảng thời gian không hợp lệ.",400);
      return sepayAdmin.list(status,page(req)*pageSize(req),pageSize(req),filter);
    }));
    api.get("/admin/sepay/transactions/:id",protect,route(async(req,res)=>{
      res.setHeader("Cache-Control","no-store");
      role(who(res),["ADMIN"]);const tx=await sepayAdmin.detail(id(req));ensure(tx,"NOT_FOUND","Không tìm thấy giao dịch.",404);
      return {...tx,history:await sepayAdmin.reviews(tx.id)};
    }));
    api.post("/admin/sepay/transactions/:id/reprocess",protect,route(async(req,res)=>{
      role(who(res),["ADMIN"]);const tx=await sepayAdmin.detail(id(req));ensure(tx,"NOT_FOUND","Không tìm thấy giao dịch.",404);
      z.object({}).strict().parse(req.body??{});
      await uow.run(async()=>{
        const changed=await sepayAdmin.reprocess(tx.id);ensure(changed.length===1,"SEPAY_REPROCESS","Chỉ giao dịch ERROR hoặc REVIEW mới được xử lý lại.");
        await sepayAdmin.review(tx.id,who(res).userId,"REPROCESS","Reprocess requested",null);
      });
      return {queued:true};
    }));
    api.post("/admin/sepay/transactions/:id/resolve",protect,route(async(req,res)=>{
      role(who(res),["ADMIN"]);const body=z.object({outcome:z.enum(["confirmed_external","refund_external","unmatched"]),reason:z.string().trim().min(3).max(1000),evidenceReference:z.string().trim().max(256).nullable().optional()}).strict().parse(req.body);
      const tx=await sepayAdmin.detail(id(req));ensure(tx,"NOT_FOUND","Không tìm thấy giao dịch.",404);
      await uow.run(()=>sepayAdmin.resolve(tx.id,who(res).userId,body.outcome,body.reason,body.evidenceReference??null));
      return {recorded:true};
    }));
  }
  api.get(
    "/me/notifications",
    protect,
    route((req, res) =>
      notifications.inbox(
        who(res),
        page(req),
        z.enum(["true", "false"]).default("false").parse(req.query.unread) ===
          "true",
      ),
    ),
  );
  api.get(
    "/me/notifications/count",
    protect,
    route((_req, res) => notifications.count(who(res))),
  );
  api.post(
    "/me/notifications/read-all",
    protect,
    route(async (_req, res) => {
      await notifications.markAllRead(who(res));
    }),
  );
  api.post(
    "/me/notifications/:id/read",
    protect,
    route((req, res) => notifications.markRead(who(res), id(req))),
  );
  api.get(
    "/health",
    route(async () => {
      await events.categories();
      return { status: "ok" };
    }),
  );
  api.get(
    "/config",
    route(() => ({
      paymentMode: payments.provider.enabled()
        ? payments.provider.name
        : "disabled",
      sepayEnabled: Boolean(config.sepay && config.sepayAcceptNewPayments !== false),
    })),
  );
  api.get("/payments/vnpay/ipn", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await booking.vnpayIpn(req.query);
      res.json(
        result === "ALREADY_APPLIED"
          ? { RspCode: "02", Message: "Order already confirmed" }
          : { RspCode: "00", Message: "Confirm Success" },
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      const codes: Record<string, string> = {
        VNPAY_SIGNATURE: "97",
        VNPAY_MERCHANT: "97",
        VNPAY_NOT_FOUND: "01",
        VNPAY_AMOUNT: "04",
      };
      res.json({
        RspCode: codes[code ?? ""] ?? "99",
        Message: "Unable to confirm payment",
      });
    }
  });
  api.get("/payments/vnpay/return", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    let target = "/orders";
    try {
      const result = payments.provider.verifyIpn?.(req.query);
      if (result) {
        const payment = await payments.byReference(
          "vnpay_sandbox",
          result.merchant,
          result.reference,
        );
        if (payment) target = `/checkout/${payment.order_id}`;
      }
    } catch {
      /* Return never mutates payment state or trusts browser status. */
    }
    const url = new URL(target, config.clientUrl ?? "http://localhost:5173");
    const href = url.href
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;");
    res
      .type("html")
      .send(
        `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EventHub · VNPay Sandbox</title><body style="font:18px system-ui;max-width:600px;margin:60px auto;padding:20px"><h1>Quay lại EventHub</h1><p>Máy chủ đang kiểm tra kết quả thanh toán. Vé chỉ được phát hành khi giao dịch đã được xác nhận.</p><p><a href="${href}">Xem đơn hàng trên web</a></p><p>Nếu dùng ứng dụng điện thoại, hãy quay lại EventHub và chọn “Cập nhật trạng thái”.</p></body></html>`,
      );
  });
  api.post(
    "/auth/register",
    route(async (req, res) => {
      const d = registerSchema.parse(req.body);
      return loginResult(res, await auth.register(d));
    }),
  );
  api.post(
    "/auth/login",
    route(async (req, res) => {
      const d = loginSchema.parse(req.body);
      return loginResult(res, await auth.login(d.email, d.password));
    }),
  );
  api.post(
    "/auth/refresh-token",
    route(async (req, res) => {
      if (req.headers.origin && !allowedClientOrigins.has(req.headers.origin))
        console.warn("Rejected refresh-token Origin", {
          receivedOrigin: req.headers.origin,
          expectedOrigins: [...allowedClientOrigins],
        });
      ensure(
        !req.headers.origin || allowedClientOrigins.has(req.headers.origin),
        "ORIGIN",
        "Origin không được phép làm mới phiên đăng nhập.",
        403,
      );
      const refreshToken = req.cookies.refreshToken;
      if (typeof refreshToken !== "string" || !refreshToken.trim())
        throw Object.assign(new Error("Phiên đăng nhập đã hết hạn."), {
          status: 401,
          code: "UNAUTHORIZED",
        });
      return loginResult(
        res,
        await auth.refresh(text.parse(refreshToken)),
      );
    }),
  );
  // Native clients store rotating refresh tokens in OS-backed secure storage.
  // Browser clients keep the existing HttpOnly cookie flow instead.
  api.use("/auth/mobile", (req, _res, next) => {
    if (req.headers.origin)
      return next(
        Object.assign(new Error("Trình duyệt phải dùng phiên đăng nhập web."), {
          status: 403,
          code: "NATIVE_ONLY",
        }),
      );
    next();
  });
  api.post(
    "/auth/mobile/register",
    route((req) => auth.register(registerSchema.parse(req.body))),
  );
  api.post(
    "/auth/mobile/login",
    route((req) => {
      const d = loginSchema.parse(req.body);
      return auth.login(d.email, d.password);
    }),
  );
  api.post(
    "/auth/mobile/refresh-token",
    route((req) =>
      auth.refresh(z.string().min(1).max(256).parse(req.body.refreshToken)),
    ),
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
        .object({
          currentPassword: z.string().min(1).max(200),
          newPassword: password,
        })
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
            businessName: text.max(200),
            taxIdOrBusinessLicense: text.max(100),
            websiteOrSocial: text.max(500),
            headOfficeAddress: text.max(500),
            mainEventCategory: text.max(200),
            expectedEventScale: text.max(100),
          })
          .parse(req.body),
      ),
    ),
  );
  api.get(
    "/organizer/events",
    protect,
    route(async (req, res) => {
      role(who(res), ["ORGANIZER", "ADMIN"]);
      const limit = pageSize(req);
      const rows = await events.list({
        owner: who(res).userId,
        limit,
        offset: page(req) * limit,
      });
      const ids = rows.map((e) => e.id);
      const [revenue, capacity] = await Promise.all([
        orders.revenueByEvent(ids),
        orders.capacityByEvent(ids),
      ]);
      const revenueMap = new Map(
        revenue.map((r) => [r.event_id, Number(r.revenue)]),
      );
      const capacityMap = new Map(
        capacity.map((c) => [
          c.event_id,
          { capacity: Number(c.capacity), sold: Number(c.sold_quantity) },
        ]),
      );
      return rows.map((e) => {
        const { capacity: cap, sold } = capacityMap.get(e.id) ?? {
          capacity: 0,
          sold: 0,
        };
        return {
          ...e,
          revenue: revenueMap.get(e.id) ?? 0,
          capacity: cap,
          sold_quantity: sold,
          fill_rate: cap === 0 ? 0 : sold / cap,
        };
      });
    }),
  );
  api.get(
    "/organizer/events/status-counts",
    protect,
    route((req, res) => {
      role(who(res), ["ORGANIZER", "ADMIN"]);
      return events.statusCounts(who(res).userId);
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
  api.get(
    "/me/wait-queue",
    protect,
    route((req, res) => orders.waitList(who(res).userId, page(req) * 50)),
  );
  api.post(
    "/events/:id/wait-queue",
    protect,
    route((req, res) => {
      const d = z.object({ ticketTypeId: uuid }).parse(req.body);
      return waitQueue.join(who(res), id(req), d.ticketTypeId);
    }),
  );
  api.delete(
    "/me/wait-queue/:id",
    protect,
    route((req, res) => waitQueue.leave(who(res), id(req))),
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
    "/me/order-history",
    protect,
    route((req, res) => createOrderHistory(orders, payments).list(who(res), z.object({
      page: z.coerce.number().int().min(0).max(10000).default(0),
      pageSize: z.coerce.number().int().min(1).max(50).default(5),
      q: z.string().trim().max(200).default(""),
      group: z.enum(["all", "paid", "processing", "closed"]).default("all"),
      from: date.optional(), toExclusive: date.optional(),
    }).parse(req.query))),
  );
  api.get("/me/order-history/:id", protect,
    route((req, res) => createOrderHistory(orders, payments).detail(who(res), id(req))));
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
    route((req, res) => booking.startPayment(who(res), id(req), req.ip)),
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
  // Only expose event display fields after the ticket's ownership is checked.
  const ticketEvent = async (eventId: string) => {
    const event = await events.one(eventId);
    if (!event) return null;
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      venue_name: event.venue_name,
      address: event.address,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
    };
  };
  api.get(
    "/me/tickets",
    protect,
    route(async (req, res) => {
      const tickets = await orders.tickets(who(res).userId, null, page(req) * 50);
      const metadata = new Map(
        await Promise.all(
          [...new Set(tickets.map((t) => String(t.event_id)))].map(
            async (eventId) => [eventId, await ticketEvent(eventId)] as const,
          ),
        ),
      );
      return tickets.map((ticket) => ({
        ...ticket,
        event: metadata.get(ticket.event_id) ?? null,
      }));
    }),
  );
  api.get(
    "/me/tickets/:id",
    protect,
    route(async (req, res) => {
      const t = await orders.qr(who(res), id(req));
      const { token, ...safe } = t;
      return {
        ...safe,
        event: await ticketEvent(t.eventId),
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
    "/organizer/events/:eventId/order-manager",
    protect,
    route((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const filters = z.object({
        page: z.coerce.number().int().min(0).max(10000).default(0),
        q: z.string().trim().max(200).default(""),
        group: z.enum(["all", "paid", "processing", "closed"]).default("all"),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }).strict().parse(req.query);
      return orderManager.list(who(res), id(req, "eventId"), filters);
    }),
  );
  api.get(
    "/organizer/events/:eventId/orders/:orderId/tickets",
    protect,
    route((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      z.object({}).strict().parse(req.query);
      return orderManager.preview(who(res), id(req, "eventId"), id(req, "orderId"));
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
  api.get(
    "/organizer/events/:id/staff",
    protect,
    route(async (req, res) => {
      await events.guard(id(req), who(res));
      return events.staffList(id(req), page(req) * 50);
    }),
  );
  api.post(
    "/organizer/events/:id/staff",
    protect,
    route((req, res) =>
      booking.inviteStaff(who(res), id(req), email.parse(req.body.email)),
    ),
  );
  api.delete(
    "/organizer/events/:id/staff/:staffId",
    protect,
    route((req, res) =>
      booking.revokeStaff(who(res), id(req), id(req, "staffId")),
    ),
  );
  api.get(
    "/organizer/events/:id/checkins",
    protect,
    route((req, res) =>
      booking.checkinHistory(who(res), id(req), page(req) * 50),
    ),
  );
  api.get(
    "/me/checkin-assignments",
    protect,
    route((req, res) =>
      events.staffAssignments(who(res).userId, page(req) * 50),
    ),
  );
  api.post(
    "/me/checkin-invitations/:id/respond",
    protect,
    route((req, res) =>
      booking.respondStaff(
        who(res),
        id(req),
        z.boolean().parse(req.body.accept),
      ),
    ),
  );
  api.get(
    "/checkin/events/:id",
    protect,
    route(async (req, res) => {
      const e = await events.checkinGuard(id(req), who(res));
      return {
        id: e.id,
        title: e.title,
        venue_name: e.venue_name,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        checkin_opens_at: e.checkin_opens_at,
        checkin_closes_at: e.checkin_closes_at,
      };
    }),
  );
  api.post(
    "/checkin/events/:id/checkins",
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
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 0,
        parts: 1,
        fieldNameSize: 100,
      },
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
    waitQueue,
    payments,
    notifications,
    sepayWebhook,
    sepayAdmin,
    sepayV2,
    uow,
  };
}
