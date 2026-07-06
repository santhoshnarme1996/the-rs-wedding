import crypto from "node:crypto";
import { requireAdmin } from "../_lib/adminAuth.js";
import { ensureSchema, getSql, handleDatabaseError, serializeInvitee } from "../_lib/db.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

const canAccessFamily = (admin, family) => admin.family === "all" || admin.family === family;

const generateInviteCode = (family) =>
  `${family === "rithikha" ? "RS" : "SR"}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const normalizeInvitee = (payload, admin) => {
  const hostFamily = String(payload.hostFamily || admin.family || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const eventMode = String(payload.eventMode || "").trim();
  const invitedReception = eventMode ? ["reception", "both"].includes(eventMode) : Boolean(payload.invitedEvents?.reception);
  const invitedWedding = eventMode ? ["wedding", "both"].includes(eventMode) : Boolean(payload.invitedEvents?.wedding);
  const notes = String(payload.notes || "").trim();
  const inviteSent = Boolean(payload.inviteSent);

  if (!["santhosh", "rithikha"].includes(hostFamily)) {
    return { error: "Choose Santhosh or Rithikha as the host family." };
  }

  if (!canAccessFamily(admin, hostFamily)) {
    return { error: "You cannot add invitees for this family." };
  }

  if (!name) {
    return { error: "Guest name is required." };
  }

  if (!invitedReception && !invitedWedding) {
    return { error: "Select Reception, Wedding, or both." };
  }

  return {
    value: {
      hostFamily,
      name,
      phone,
      email,
      invitedReception,
      invitedWedding,
      inviteSent,
      notes,
    },
  };
};

const fetchInvitees = async (sql, admin) => {
  const family = admin.family === "all" ? null : admin.family;

  const rows = family
    ? await sql`
      SELECT
        i.*,
        (r.id IS NOT NULL) AS has_responded,
        r.updated_at AS responded_at
      FROM invitees i
      LEFT JOIN rsvps r ON r.invitee_id = i.id
      WHERE i.host_family = ${family}
      ORDER BY i.created_at DESC
    `
    : await sql`
      SELECT
        i.*,
        (r.id IS NOT NULL) AS has_responded,
        r.updated_at AS responded_at
      FROM invitees i
      LEFT JOIN rsvps r ON r.invitee_id = i.id
      ORDER BY i.created_at DESC
    `;

  return rows.map(serializeInvitee);
};

export default async function handler(request, response) {
  try {
    const admin = requireAdmin(request, response);

    if (!admin) {
      return undefined;
    }

    const sql = getSql();
    await ensureSchema(sql);

    if (request.method === "GET") {
      return response.status(200).json({ invitees: await fetchInvitees(sql, admin) });
    }

    if (request.method === "POST") {
      const body = normalizeBody(request.body);
      const entries = Array.isArray(body.invitees) ? body.invitees : [body];
      const created = [];

      for (const entry of entries) {
        const validation = normalizeInvitee(entry, admin);

        if (validation.error) {
          return response.status(400).json({ error: validation.error });
        }

        const invitee = validation.value;
        const [row] = await sql`
          INSERT INTO invitees (
            invite_code,
            host_family,
            guest_name,
            phone,
            email,
            invited_reception,
            invited_wedding,
            invite_sent,
            notes
          )
          VALUES (
            ${generateInviteCode(invitee.hostFamily)},
            ${invitee.hostFamily},
            ${invitee.name},
            ${invitee.phone || null},
            ${invitee.email || null},
            ${invitee.invitedReception},
            ${invitee.invitedWedding},
            ${invitee.inviteSent},
            ${invitee.notes || null}
          )
          RETURNING *, false AS has_responded, NULL::timestamptz AS responded_at
        `;

        created.push(serializeInvitee(row));
      }

      return response.status(201).json({ invitees: created });
    }

    if (request.method === "PATCH") {
      const body = normalizeBody(request.body);
      const id = String(body.id || "");

      if (!id) {
        return response.status(400).json({ error: "Invitee id is required." });
      }

      const existing = await sql`SELECT host_family FROM invitees WHERE id = ${id} LIMIT 1`;

      if (!existing.length) {
        return response.status(404).json({ error: "Invitee not found." });
      }

      if (!canAccessFamily(admin, existing[0].host_family)) {
        return response.status(403).json({ error: "You cannot update this invitee." });
      }

      const [row] = await sql`
        UPDATE invitees
        SET invite_sent = ${Boolean(body.inviteSent)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *, (
          SELECT r.id IS NOT NULL FROM rsvps r WHERE r.invitee_id = invitees.id LIMIT 1
        ) AS has_responded,
        (
          SELECT r.updated_at FROM rsvps r WHERE r.invitee_id = invitees.id LIMIT 1
        ) AS responded_at
      `;

      return response.status(200).json({ invitee: serializeInvitee(row) });
    }

    if (request.method === "DELETE") {
      const body = normalizeBody(request.body);
      const id = String(body.id || request.query.id || "");

      if (!id) {
        return response.status(400).json({ error: "Invitee id is required." });
      }

      const existing = await sql`SELECT host_family FROM invitees WHERE id = ${id} LIMIT 1`;

      if (!existing.length) {
        return response.status(404).json({ error: "Invitee not found." });
      }

      if (!canAccessFamily(admin, existing[0].host_family)) {
        return response.status(403).json({ error: "You cannot delete this invitee." });
      }

      await sql`DELETE FROM invitees WHERE id = ${id}`;

      return response.status(200).json({ ok: true });
    }

    response.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
