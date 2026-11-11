// Generate a source inventory. Presence in source is not runtime verification.
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const mapping = {
  A1: ["/", "/", "GET /events; GET /categories", "Guest"],
  A2: [
    "/explore",
    "/explore; /discovery",
    "GET /events; GET /categories",
    "Guest",
  ],
  A3: [
    "/events/:slug",
    "/events/[slug]",
    "GET /events/:slug; POST /orders",
    "Guest/User",
  ],
  A4: [
    "/auth/login; /auth/register",
    "/auth",
    "POST /auth/mobile/login; POST /auth/mobile/register",
    "Guest",
  ],
  A5: [
    "/register-organizer",
    "/register-organizer",
    "GET/POST /me/organizer-applications",
    "User",
  ],
  A6: [
    "/checkout/:id",
    "/orders/[id]",
    "GET /config; GET /me/orders/:id; POST /orders/:id/payments; GET/POST /sepay/orders/:orderId/payment; POST /orders/:id/cancel",
    "User",
  ],
  A7: [
    "/payment-status/:orderId",
    "/payment-status/[id]",
    "GET /me/order-history/:id",
    "User",
  ],
  A8: [
    "/tickets; /tickets/:id",
    "/tickets; /tickets/[id]",
    "GET /me/tickets; GET /me/tickets/:id",
    "User",
  ],
  A9: ["/orders", "/orders", "GET /me/orders; GET /me/order-history", "User"],
  A10: [
    "/profile",
    "/profile; /change-password",
    "GET /auth/me; PATCH /me; POST /me/password; POST /media",
    "User",
  ],
  A11: [
    "/auth/reset-password",
    "/reset-password",
    "POST /auth/forgot-password; POST /auth/verify-otp; POST /auth/reset-password",
    "Guest",
  ],
  A12: [
    "/notifications",
    "/notifications",
    "GET /me/notifications; GET /me/notifications/count; POST /me/notifications/read-all; POST /me/notifications/:id/read",
    "User",
  ],
  A13: [
    "/checkin",
    "/staff",
    "GET /me/checkin-assignments; POST /me/checkin-invitations/:id/respond",
    "Assigned user",
  ],
  B1: [
    "/organizer/dashboard",
    "/organizer",
    "GET /organizer/dashboard",
    "Organizer/Admin",
  ],
  B2: [
    "/organizer; /organizer/events",
    "/organizer/events",
    "GET /organizer/events; GET /organizer/events/status-counts",
    "Organizer/Admin",
  ],
  B3: [
    "/organizer/events/:id",
    "/organizer/events/[id]",
    "GET/PATCH /organizer/events/:id; POST /organizer/events/:id/submit; POST /organizer/events/:id/cancel; POST /organizer/events/:id/pause",
    "Owner",
  ],
  B4: [
    "/organizer/new",
    "/organizer/events/new",
    "POST /organizer/events; GET /categories; POST /media",
    "Organizer/Admin",
  ],
  B5: [
    "/organizer/events/:id/tickets",
    "/organizer/events/[id]/tickets",
    "POST /organizer/events/:id/ticket-types; PATCH/DELETE /organizer/events/:id/ticket-types/:typeId",
    "Owner",
  ],
  B6: [
    "/organizer/order-events; /organizer/events/:id/orders",
    "/organizer/events/[id]/orders",
    "GET /organizer/events/:id/order-manager",
    "Owner",
  ],
  B7: [
    "/organizer/events/:id/orders/:orderId",
    "/organizer/events/[id]/orders/[orderId]",
    "GET /organizer/events/:id/orders/:orderId; GET /organizer/events/:eventId/orders/:orderId/tickets",
    "Owner",
  ],
  B8: [
    "/organizer/events/:id/attendees",
    "/organizer/events/[id]/attendees",
    "GET /organizer/events/:id/attendees; GET/POST /organizer/events/:id/staff; DELETE /organizer/events/:id/staff/:staffId",
    "Owner",
  ],
  B9: [
    "/organizer/qr-scan; /organizer/events/:id/checkin; /checkin/events/:id",
    "/checkin/[id]",
    "POST /checkin/events/:id/checkins",
    "Owner/Assigned staff",
  ],
  B10: [
    "/organizer/events/:id/stats",
    "/organizer/events/[id]/stats",
    "GET /organizer/events/:id/analytics; GET /organizer/events/:id/analytics/export.csv; GET /organizer/events/:id/stats",
    "Owner",
  ],
  B11: [
    "/organizer/profile",
    "/organizer/profile; /organizer/team",
    "GET/PATCH /organizer/profile; GET/POST /organizer/team; GET /organizer/team/:id/events; DELETE /organizer/team/:id; DELETE /organizer/team/:id/events/:staffId",
    "Organizer/Admin",
  ],
  B12: [
    "/organizer/events/:id/:tab",
    "/organizer/events/[id]/checkins",
    "GET /organizer/events/:id/checkins",
    "Owner",
  ],
  C1: ["/admin/dashboard", "/admin", "GET /admin/stats; GET /admin/stats/revenue-daily", "Admin"],
  C2: [
    "/admin/users",
    "/admin/users",
    "GET /admin/users; PATCH /admin/users/:id; PATCH /admin/users/bulk-status; GET /admin/users/export",
    "Admin",
  ],
  C3: ["/admin/users", "/admin/users/[id]", "GET /admin/users/:id", "Admin"],
  C4: [
    "/admin/applications",
    "/admin/organizers",
    "GET /admin/organizer-applications",
    "Admin",
  ],
  C5: [
    "/admin/applications/:applicationId",
    "/admin/organizers/[id]",
    "GET /admin/organizer-applications/:id; GET /admin/events?organizerId=:userId",
    "Admin",
  ],
  C6: [
    "/admin/applications/review; /admin/applications/review/:applicationId",
    "/admin/applications; /admin/applications/[id]",
    "GET /admin/organizer-applications; POST /admin/organizer-applications/:id/review",
    "Admin",
  ],
  C7: [
    "/admin/categories",
    "/admin/categories",
    "GET/POST /admin/categories; PATCH/DELETE /admin/categories/:id",
    "Admin",
  ],
  C8: [
    "/admin/events",
    "/admin/events",
    "GET /admin/events; GET /admin/events/kpis; GET /admin/events/metrics",
    "Admin",
  ],
  C9: [
    "/admin/events/review/:id",
    "/admin/events/[id]",
    "GET /organizer/events/:id; POST /admin/events/:id/review",
    "Admin",
  ],
  C10: [
    "/admin/payments",
    "/admin/payments",
    "GET /admin/payments; GET /admin/sepay/transactions",
    "Admin",
  ],
  C11: ["/admin/events/review", "/admin/reviews", "GET /admin/events", "Admin"],
  C12: [
    "/admin/settings",
    "/admin/settings",
    "GET /admin/settings/payment-information; GET /admin/administrators",
    "Admin",
  ],
};
const names = new Map();
for (const line of read("docs/PROJECT_MASTER_PLAN.md").split(/\r?\n/)) {
  const match = line.match(/^\| ([ABC]\d+) \| ([^|]+) \|/);
  if (match && !names.has(match[1])) names.set(match[1], match[2].trim());
}
const source = read("server/src/app.ts");
const endpoints = [
  ...source.matchAll(/api\.(get|post|patch|delete)\(\s*["']([^"']+)["']/g),
].map((m) => `${m[1].toUpperCase()} ${m[2]}`);
const webRoutes = [
  ...read("client/src/App.tsx").matchAll(/path="([^"]+)"/g),
].map((m) => m[1]);
const routeFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (file.endsWith(".tsx"))
      routeFiles.push(
        path
          .relative(path.join(root, "mobile/src/app"), file)
          .replaceAll("\\", "/"),
      );
  }
}
walk(path.join(root, "mobile/src/app"));
const table = Object.entries(mapping)
  .map(
    ([code, [web, mobile, api, role]]) =>
      `| ${code} — ${names.get(code)} | ${web} | ${mobile} | ${api} | ${role} |`,
  )
  .join("\n");
const output = `# Inventory web → mobile → API\n\nĐược tạo bằng \`node scripts/mobile-inventory.cjs\`; thời điểm ${new Date().toISOString()}.\n\nMapping mobile là đích triển khai, không khẳng định đã có route. Endpoint mapping cần đối chiếu với danh sách source phía dưới; API contract/runtime được ghi riêng trong báo cáo theo đợt. Các trang web hiện hành có thể chứa placeholder theo scope đã duyệt.\n\n## Mapping 37 mã màn\n\n| Màn hình | Route web | Đích mobile | Nhóm API cần xác minh | Quyền |\n|---|---|---|---|---|\n${table}\n\n## Route phụ cần bảo toàn\n\n- Chọn sự kiện trước quản lý vé/đơn/người tham dự/thống kê/scanner.\n- Lời mời đội ngũ: \`/organizer/team-invitations\`, accept/decline; GET/POST /organizer/team, GET /organizer/team/:id/events, DELETE /organizer/team/:id/events/:staffId, DELETE /organizer/team/:id.\n- Chi tiết vé, chi tiết đơn, chi tiết hồ sơ duyệt; search/export/filters và thay đổi trạng thái phải kiểm tra trong từng page, không suy ra đầy đủ chỉ từ URL.\n- Quản lý quản trị viên mới và yêu cầu thay đổi pháp lý BTC phải được rà soát thêm ngoài 37 mã lịch sử.\n\n## Toàn bộ route JSX quan sát được (${webRoutes.length})\n\n${webRoutes.map((s) => "- \`" + s + "\`").join("\n")}\n\n## Toàn bộ đăng ký API tĩnh quan sát được (${endpoints.length})\n\n${endpoints.map((s) => "- \`" + s + "\`").join("\n")}\n\n## Route file native hiện có (${routeFiles.length})\n\n${routeFiles.map((s) => "- \`" + s + "\`").join("\n")}\n\n## Gate M0 còn lại\n\nInventory route đã lập. Chưa đóng M0 cho toàn hệ thống: cần kiểm kê từng nút/action/filter/export trong B/C, xác minh contract thực tế, wireframe theo vai trò, thiết bị/OS và review. Không coi mapping đề xuất là API đã chạy.\n`;
fs.writeFileSync(path.join(root, "docs/ui/MOBILE_ROUTE_INVENTORY.md"), output);
console.log(
  `Inventory: ${Object.keys(mapping).length} screens, ${webRoutes.length} web routes, ${endpoints.length} source endpoints, ${routeFiles.length} mobile route files.`,
);
