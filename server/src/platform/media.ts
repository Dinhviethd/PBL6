import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { ensure } from "../contracts/core";
export const uploadDirectory = path.resolve(
  process.env.UPLOAD_DIR ?? ".local/uploads",
);
export async function saveImage(buffer: Buffer) {
  let image: Buffer;
  try {
    image = await sharp(buffer, { limitInputPixels: 25000000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw Object.assign(
      new Error("File không phải ảnh hợp lệ hoặc vượt kích thước cho phép."),
      { status: 400, code: "INVALID_IMAGE" },
    );
  }
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return new Promise<{ url: string }>((resolve, reject) =>
      cloudinary.uploader
        .upload_stream(
          { folder: "eventhub", resource_type: "image" },
          (err, r) => (err ? reject(err) : resolve({ url: r!.secure_url })),
        )
        .end(image),
    );
  }
  ensure(
    process.env.NODE_ENV !== "production",
    "MEDIA_NOT_CONFIGURED",
    "Chưa cấu hình lưu ảnh production.",
    503,
  );
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(uploadDirectory, filename), image);
  return { url: `/uploads/${filename}` };
}
