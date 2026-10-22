const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

test("patched image decoder converts supported formats and rejects invalid/oversized pixels", async () => {
  const root = path.resolve(__dirname, "../.local");
  await fs.mkdir(root, { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, "media-test-"));
  process.env.UPLOAD_DIR = directory;
  process.env.NODE_ENV = "test";
  // Test must never use a real external storage account, even if inherited.
  for (const key of [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ])
    delete process.env[key];
  const { saveImage } = require("../dist/platform/media");
  try {
    const [major, minor, patch] = sharp.versions.sharp.split(".").map(Number);
    assert.ok(
      major > 0 || minor > 35 || (minor === 35 && patch >= 4),
      "Sharp must include the libvips/libheif security fixes",
    );
    for (const format of ["jpeg", "png", "webp", "gif", "tiff", "avif"]) {
      const input = await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#abcdef" },
      })
        .toFormat(format)
        .toBuffer();
      const result = await saveImage(input);
      assert.match(result.url, /^\/uploads\/[0-9a-f-]+\.webp$/);
      const metadata = await sharp(
        await fs.readFile(path.join(directory, path.basename(result.url))),
      ).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, 8);
    }
    await assert.rejects(
      saveImage(Buffer.from("not an image")),
      (e) => e.code === "INVALID_IMAGE",
    );
    const oversized = await sharp({
      create: { width: 5001, height: 5001, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await assert.rejects(
      saveImage(oversized),
      (e) => e.code === "INVALID_IMAGE",
    );
  } finally {
    for (const filename of await fs.readdir(directory))
      await fs.unlink(path.join(directory, filename));
    await fs.rmdir(directory);
  }
});
