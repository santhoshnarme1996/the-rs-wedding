import crypto from "node:crypto";
import { ensureSchema, getSql, handleDatabaseError, serializeRsvp } from "./_lib/db.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const validateRsvp = (payload) => {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const inviteCode = String(payload.inviteCode || "").trim();
  const guestCount = Number.parseInt(payload.guestCount, 10);
  const reception = Boolean(payload.events?.reception);
  const wedding = Boolean(payload.events?.wedding);

  if (!inviteCode) {
    return { error: "This RSVP needs a personalized invite link." };
  }

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
      inviteCode,
      name,
      phone,
      email,
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
      const { id, inviteCode } = request.query;

      if (!id && !inviteCode) {
        return response.status(400).json({ error: "Missing RSVP id or invite code." });
      }

      const rows = id
        ? await sql`
          SELECT id, invitee_id, guest_name, phone, email, guest_count, attending_reception, attending_wedding, created_at, updated_at
          FROM rsvps
          WHERE id = ${String(id)}
          LIMIT 1
        `
        : await sql`
          SELECT r.id, r.invitee_id, r.guest_name, r.phone, r.email, r.guest_count, r.attending_reception, r.attending_wedding, r.created_at, r.updated_at
          FROM rsvps r
          JOIN invitees i ON i.id = r.invitee_id
          WHERE i.invite_code = ${String(inviteCode)}
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
      const invitees = await sql`
        SELECT id, guest_name, phone, email, invited_reception, invited_wedding, is_active
        FROM invitees
        WHERE invite_code = ${rsvp.inviteCode}
        LIMIT 1
      `;

      if (!invitees.length || !invitees[0].is_active) {
        return response.status(404).json({ error: "Invite not found." });
      }

      const invitee = invitees[0];

      if (rsvp.reception && !invitee.invited_reception) {
        return response.status(400).json({ error: "This invite does not include Reception." });
      }

      if (rsvp.wedding && !invitee.invited_wedding) {
        return response.status(400).json({ error: "This invite does not include Wedding." });
      }

      const rows = await sql`
        INSERT INTO rsvps (
          id,
          invitee_id,
          guest_name,
          phone,
          email,
          guest_count,
          attending_reception,
          attending_wedding
        )
        VALUES (
          ${rsvp.id},
          ${invitee.id},
          ${rsvp.name},
          ${rsvp.phone},
          ${rsvp.email || invitee.email || null},
          ${rsvp.guestCount},
          ${rsvp.reception},
          ${rsvp.wedding}
        )
        ON CONFLICT (invitee_id) WHERE invitee_id IS NOT NULL DO UPDATE SET
          guest_name = EXCLUDED.guest_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          guest_count = EXCLUDED.guest_count,
          attending_reception = EXCLUDED.attending_reception,
          attending_wedding = EXCLUDED.attending_wedding,
          updated_at = NOW()
        RETURNING id, invitee_id, guest_name, phone, email, guest_count, attending_reception, attending_wedding, created_at, updated_at
      `;

      return response.status(200).json({ rsvp: serializeRsvp(rows[0]) });
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
