import { ensureSchema, getSql, handleDatabaseError } from "./_lib/db.js";

const serializePublicInvite = (row) => ({
  inviteCode: row.invite_code,
  hostFamily: row.host_family,
  guestName: row.guest_name,
  phone: row.phone || "",
  email: row.email || "",
  invitedEvents: {
    reception: row.invited_reception,
    wedding: row.invited_wedding,
  },
});

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return response.status(405).json({ error: "Method not allowed." });
    }

    const code = String(request.query.code || "").trim();

    if (!code) {
      return response.status(400).json({ error: "Missing invite code." });
    }

    const sql = getSql();
    await ensureSchema(sql);

    const rows = await sql`
      SELECT invite_code, host_family, guest_name, phone, email, invited_reception, invited_wedding
      FROM invitees
      WHERE invite_code = ${code}
        AND is_active = TRUE
      LIMIT 1
    `;

    if (!rows.length) {
      return response.status(404).json({ error: "Invite not found." });
    }

    return response.status(200).json({ invite: serializePublicInvite(rows[0]) });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
