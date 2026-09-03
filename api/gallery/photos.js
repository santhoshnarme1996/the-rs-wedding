import { ensureSchema, getSql, handleDatabaseError, serializePhoto } from "../_lib/db.js";
import { deleteObject } from "../_lib/s3.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const VALID_EVENTS = ["engagement", "reception", "wedding"];

const parseCapturedAt = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export default async function handler(request, response) {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (request.method === "GET") {
      const rows = await sql`
        SELECT p.id, p.profile_id, p.url, p.caption, p.event, p.captured_at, p.created_at, g.name
        FROM guest_photos p
        JOIN guest_profiles g ON g.id = p.profile_id
        ORDER BY COALESCE(p.captured_at, p.created_at) DESC
        LIMIT 200
      `;

      return response.status(200).json({ photos: rows.map(serializePhoto) });
    }

    if (request.method === "POST") {
      const payload = normalizeBody(request.body);
      const profileId = String(payload.profileId || "").trim();
      const key = String(payload.key || "").trim();
      const url = String(payload.url || "").trim();
      const caption = String(payload.caption || "").trim();
      const event = String(payload.event || "").trim();
      const capturedAt = parseCapturedAt(payload.capturedAt);

      if (!profileId || !key || !url) {
        return response.status(400).json({ error: "Missing photo details." });
      }

      if (!VALID_EVENTS.includes(event)) {
        return response.status(400).json({ error: "Please choose which event this photo is from." });
      }

      const profiles = await sql`SELECT id, name FROM guest_profiles WHERE id = ${profileId} LIMIT 1`;

      if (!profiles.length) {
        return response.status(404).json({ error: "Profile not found." });
      }

      const rows = await sql`
        INSERT INTO guest_photos (profile_id, s3_key, url, caption, event, captured_at)
        VALUES (${profileId}, ${key}, ${url}, ${caption || null}, ${event}, ${capturedAt})
        RETURNING id, profile_id, url, caption, event, captured_at, created_at
      `;

      return response.status(201).json({
        photo: serializePhoto({ ...rows[0], name: profiles[0].name }),
      });
    }

    if (request.method === "DELETE") {
      const payload = normalizeBody(request.body);
      const id = String(payload.id || request.query.id || "").trim();
      const profileId = String(payload.profileId || request.query.profileId || "").trim();

      if (!id || !profileId) {
        return response.status(400).json({ error: "Missing photo id or profile id." });
      }

      const rows = await sql`
        DELETE FROM guest_photos
        WHERE id = ${id} AND profile_id = ${profileId}
        RETURNING s3_key
      `;

      if (!rows.length) {
        return response.status(404).json({ error: "Photo not found for this profile." });
      }

      try {
        await deleteObject(rows[0].s3_key);
      } catch (error) {
        console.error("Failed to delete S3 object", error);
      }

      return response.status(200).json({ ok: true });
    }

    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
