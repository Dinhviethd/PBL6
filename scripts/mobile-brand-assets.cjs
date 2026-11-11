// Export app assets from the exact logo used by AuthHeader/AuthFooter on the web.
const path = require("node:path");
const fs = require("node:fs");
const sharp = require("../server/node_modules/sharp");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "client/public/logo.png");
const assets = path.join(root, "mobile/assets");
async function main() {
  fs.copyFileSync(source, path.join(assets, "logo.png"));
  const logo = await sharp(source).resize({ width: 820, withoutEnlargement: true }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#F8FAFC" } })
    .composite([{ input: logo, gravity: "center" }]).removeAlpha().png()
    .toFile(path.join(assets, "app-icon.png"));
  // The entire original wordmark fits inside the Android adaptive safe circle.
  const foreground = await sharp(source).resize({ width: 600, withoutEnlargement: true }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: foreground, gravity: "center" }]).png()
    .toFile(path.join(assets, "adaptive-icon.png"));
  console.log("Exported app-icon.png and adaptive-icon.png from client/public/logo.png");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
