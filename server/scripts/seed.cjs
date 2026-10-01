require("dotenv").config({ quiet: true });
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { createDatabase } = require("../dist/platform/database");
async function seed() {
  if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
    throw Error(
      "Set DEMO_PASSWORD (12+ characters) explicitly before seeding.",
    );
  if (process.env.NODE_ENV === "production")
    throw Error("Demo seed is disabled in production.");
  const db = createDatabase(process.env.DATABASE_URL);
  await db.start();
  try {
    await db.uow.run(async () => {
      const auth = db.owner("auth"),
        event = db.owner("event"),
        order = db.owner("order");
      for (const code of ["USER", "ORGANIZER", "ADMIN"])
        await auth.query(
          'INSERT INTO roles("idRole",code,name,"isSystem") VALUES($1,$2,$2,true) ON CONFLICT(code) DO NOTHING',
          [randomUUID(), code],
        );
      const hash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
      let organizer;
      for (const [email, name, roles] of [
        ["customer@example.test", "Khách trải nghiệm", ["USER"]],
        ["organizer@example.test", "Ban tổ chức", ["USER", "ORGANIZER"]],
        ["organizer2@example.test", "Ban tổ chức khác", ["USER", "ORGANIZER"]],
        ["admin@example.test", "Quản trị viên", ["USER", "ADMIN"]],
      ]) {
        await auth.query(
          'INSERT INTO users("idUser",name,email,password) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING',
          [randomUUID(), name, email, hash],
        );
        const u = (
          await auth.query('SELECT "idUser" FROM users WHERE email=$1', [email])
        )[0];
        if (email === "organizer@example.test") organizer = u.idUser;
        for (const code of roles)
          await auth.query(
            'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2 ON CONFLICT DO NOTHING',
            [u.idUser, code],
          );
      }
      for (const [name, slug] of [
        ["Âm nhạc", "am-nhac"],
        ["Công nghệ", "cong-nghe"],
        ["Nghệ thuật", "nghe-thuat"],
      ])
        await event.query(
          "INSERT INTO categories(id,name,slug) VALUES($1,$2,$3) ON CONFLICT(slug) DO NOTHING",
          [randomUUID(), name, slug],
        );
      const categories = await event.query(
        "SELECT id,slug FROM categories ORDER BY slug",
      );
      for (const [index, title, slug, venue, city] of [
        [
          0,
          "Đêm nhạc bên sông Hàn",
          "dem-nhac-song-han",
          "Không gian bờ Đông",
          "Đà Nẵng",
        ],
        [
          1,
          "Build Together · Tech Meetup",
          "build-together",
          "Innovation Hub",
          "Đà Nẵng",
        ],
        [
          2,
          "Sắc màu cuối tuần",
          "sac-mau-cuoi-tuan",
          "Art Space",
          "Hồ Chí Minh",
        ],
      ]) {
        await event.query(
          "INSERT INTO events(id,organizer_id,category_id,slug,title,description,venue_name,address,city_code,starts_at,ends_at,checkin_opens_at,checkin_closes_at,status,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()+interval '7 days',now()+interval '8 days',now()-interval '1 hour',now()+interval '8 days','PUBLISHED',now()) ON CONFLICT(slug) DO NOTHING",
          [
            randomUUID(),
            organizer,
            categories[index].id,
            slug,
            title,
            "Một cuộc hẹn để gặp gỡ, khám phá và tạo nên những kỷ niệm mới. Sự kiện minh họa dành cho trải nghiệm MVP.",
            venue,
            "Trung tâm thành phố",
            city,
          ],
        );
        const e = (
          await event.query("SELECT id FROM events WHERE slug=$1", [slug])
        )[0];
        const ts = await order.query(
          "SELECT id FROM ticket_types WHERE event_id=$1",
          [e.id],
        );
        if (!ts.length)
          await order.query(
            "INSERT INTO ticket_types(id,event_id,name,price_amount,capacity,sale_starts_at,sale_ends_at) VALUES($1,$2,'Vé tiêu chuẩn',150000,100,now()-interval '1 day',now()+interval '7 days')",
            [randomUUID(), e.id],
          );
      }
    });
    console.log(
      "Demo accounts and events seeded. Passwords of existing accounts were not changed.",
    );
  } finally {
    await db.close();
  }
}
seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
