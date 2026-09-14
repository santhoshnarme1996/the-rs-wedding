import { ensureSchema, getSql, handleDatabaseError } from "../_lib/db.js";
import { buildPhotoKey, createUploadUrl, publicUrlFor, handleS3Error } from "../_lib/s3.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const payload = normalizeBody(request.body);
  const profileId = String(payload.profileId || "").trim();
  const fileName = String(payload.fileName || "").trim();
  const fileType = String(payload.fileType || "").trim();
  const fileSize = Number.parseInt(payload.fileSize, 10);

  if (!profileId) {
    return response.status(400).json({ error: "Missing profile id." });
  }

  const isImage = fileType.startsWith("image/");
  const isVideo = fileType.startsWith("video/");

  if (!isImage && !isVideo) {
    return response.status(400).json({ error: "Only image or video files can be uploaded." });
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (Number.isInteger(fileSize) && fileSize > maxBytes) {
    return response.status(400).json({
      error: isVideo ? "Videos must be under 150MB." : "Photos must be under 10MB.",
    });
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    const profiles = await sql`SELECT id FROM guest_profiles WHERE id = ${profileId} LIMIT 1`;

    if (!profiles.length) {
      return response.status(404).json({ error: "Profile not found." });
    }
  } catch (error) {
    return handleDatabaseError(error, response);
  }

  try {
    const key = buildPhotoKey(profileId, fileName);
    const uploadUrl = await createUploadUrl(key, fileType || "application/octet-stream");

    return response.status(200).json({ uploadUrl, key, publicUrl: publicUrlFor(key) });
  } catch (error) {
    return handleS3Error(error, response);
  }
}
