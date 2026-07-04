import { requireAdmin } from "../_lib/adminAuth.js";
import { ensureSchema, getSql, handleDatabaseError, serializeRsvp } from "../_lib/db.js";

const scopedWhere = (admin) => admin.family === "all" ? null : admin.family;

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return response.status(405).json({ error: "Method not allowed." });
    }

    const admin = requireAdmin(request, response);

    if (!admin) {
      return undefined;
    }

    const sql = getSql();
    await ensureSchema(sql);
    const family = scopedWhere(admin);

    const [summary] = family
      ? await sql`
        SELECT
          COUNT(*)::int AS total_rsvps,
          COALESCE(SUM(r.guest_count), 0)::int AS total_guests,
          COALESCE(SUM(CASE WHEN r.attending_reception THEN r.guest_count ELSE 0 END), 0)::int AS reception_guests,
          COALESCE(SUM(CASE WHEN r.attending_wedding THEN r.guest_count ELSE 0 END), 0)::int AS wedding_guests
        FROM rsvps r
        JOIN invitees i ON i.id = r.invitee_id
        WHERE i.host_family = ${family}
      `
      : await sql`
        SELECT
          COUNT(*)::int AS total_rsvps,
          COALESCE(SUM(guest_count), 0)::int AS total_guests,
          COALESCE(SUM(CASE WHEN attending_reception THEN guest_count ELSE 0 END), 0)::int AS reception_guests,
          COALESCE(SUM(CASE WHEN attending_wedding THEN guest_count ELSE 0 END), 0)::int AS wedding_guests
        FROM rsvps
      `;

    const rows = family
      ? await sql`
        SELECT r.id, r.invitee_id, r.guest_name, r.phone, r.email, r.guest_count, r.attending_reception, r.attending_wedding, r.created_at, r.updated_at
        FROM rsvps r
        JOIN invitees i ON i.id = r.invitee_id
        WHERE i.host_family = ${family}
        ORDER BY r.updated_at DESC
        LIMIT 500
      `
      : await sql`
        SELECT id, invitee_id, guest_name, phone, email, guest_count, attending_reception, attending_wedding, created_at, updated_at
        FROM rsvps
        ORDER BY updated_at DESC
        LIMIT 500
      `;

    return response.status(200).json({
      summary: {
        totalRsvps: summary.total_rsvps,
        totalGuests: summary.total_guests,
        receptionGuests: summary.reception_guests,
        weddingGuests: summary.wedding_guests,
      },
      rsvps: rows.map(serializeRsvp),
    });
  } catch (error) {
    return handleDatabaseError(error, response);
  }
}
