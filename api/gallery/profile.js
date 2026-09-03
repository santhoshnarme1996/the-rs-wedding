import { ensureSchema, getSql, handleDatabaseError, serializeProfile } from "../_lib/db.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const normalizePhone = (phone) => String(phone || "").replace(/[^0-9]/g, "");

export default async function handler(request, response) {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (request.method === "GET") {
      const id = String(request.query.id || "").trim();

      if (!id) {
        return response.status(400).json({ error: "Missing profile id." });
      }

      const rows = await sql`
        SELECT id, name, phone, created_at
        FROM guest_profiles
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!rows.length) {
        return response.status(404).json({ error: "Profile not found." });
      }

      return response.status(200).json({ profile: serializeProfile(rows[0]) });
    }

    if (request.method === "POST") {
      const payload = normalizeBody(request.body);
      const name = String(payload.name || "").trim();
      const phone = normalizePhone(payload.phone);

      if (!name) {
        return response.status(400).json({ error: "Please enter your name." });
      }

      if (!phone) {
        return response.status(400).json({ error: "Please enter your phone number." });
      }

      const rows = await sql`
        INSERT INTO guest_profiles (name, phone)
        VALUES (${name}, ${phone})
        ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, phone, created_at
      `;

      return response.status(200).json({ profile: serializeProfile(rows[0]) });
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
