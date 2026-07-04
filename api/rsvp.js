import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    const error = new Error("DATABASE_URL is not configured");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }

  return neon(process.env.DATABASE_URL);
};

const ensureSchema = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 1 AND 20),
      attending_reception BOOLEAN NOT NULL DEFAULT FALSE,
      attending_wedding BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const serializeRsvp = (row) => ({
  id: row.id,
  name: row.guest_name,
  phone: row.phone,
  guestCount: row.guest_count,
  events: {
    reception: row.attending_reception,
    wedding: row.attending_wedding,
  },
});

const validateRsvp = (payload) => {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const guestCount = Number.parseInt(payload.guestCount, 10);
  const reception = Boolean(payload.events?.reception);
  const wedding = Boolean(payload.events?.wedding);

  if (!name) {
    return { error: "Please enter your name." };
  }

  if (!phone) {
    return { error: "Please enter your phone number." };
  }

  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
    return { error: "Please enter a guest count between 1 and 20." };
  }

  if (!reception && !wedding) {
    return { error: "Please select at least one event." };
  }

  return {
    value: {
      id: payload.id ? String(payload.id) : crypto.randomUUID(),
      name,
      phone,
      guestCount,
      reception,
      wedding,
    },
  };
};

export default async function handler(request, response) {
  try {
    const sql = getSql();

    if (request.method === "GET" && request.query.health === "1") {
      await sql`SELECT 1`;
      return response.status(200).json({ ok: true, database: "connected" });
    }

    await ensureSchema(sql);

    if (request.method === "GET") {
      const { id } = request.query;

      if (!id) {
        return response.status(400).json({ error: "Missing RSVP id." });
      }

      const rows = await sql`
        SELECT id, guest_name, phone, guest_count, attending_reception, attending_wedding
        FROM rsvps
        WHERE id = ${String(id)}
        LIMIT 1
      `;

      if (!rows.length) {
        return response.status(404).json({ error: "RSVP not found." });
      }

      return response.status(200).json({ rsvp: serializeRsvp(rows[0]) });
    }

    if (request.method === "POST") {
      const validation = validateRsvp(normalizeBody(request.body));

      if (validation.error) {
        return response.status(400).json({ error: validation.error });
      }

      const rsvp = validation.value;
      const rows = await sql`
        INSERT INTO rsvps (
          id,
          guest_name,
          phone,
          guest_count,
          attending_reception,
          attending_wedding
        )
        VALUES (
          ${rsvp.id},
          ${rsvp.name},
          ${rsvp.phone},
          ${rsvp.guestCount},
          ${rsvp.reception},
          ${rsvp.wedding}
        )
        ON CONFLICT (id) DO UPDATE SET
          guest_name = EXCLUDED.guest_name,
          phone = EXCLUDED.phone,
          guest_count = EXCLUDED.guest_count,
          attending_reception = EXCLUDED.attending_reception,
          attending_wedding = EXCLUDED.attending_wedding,
          updated_at = NOW()
        RETURNING id, guest_name, phone, guest_count, attending_reception, attending_wedding
      `;

      return response.status(200).json({ rsvp: serializeRsvp(rows[0]) });
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);

    if (error.code === "DATABASE_URL_MISSING") {
      return response.status(500).json({
        error: "RSVP database is not configured in Vercel yet.",
        code: "DATABASE_URL_MISSING",
      });
    }

    return response.status(500).json({ error: "Something went wrong while saving the RSVP." });
  }
}
