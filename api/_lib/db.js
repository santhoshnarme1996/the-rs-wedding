import { neon } from "@neondatabase/serverless";

export const getSql = () => {
  const databaseUrl = process.env.RSVP_DB_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    const error = new Error("RSVP_DB_DATABASE_URL or DATABASE_URL is not configured");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }

  return neon(databaseUrl);
};

export const ensureSchema = async (sql) => {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS invitees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invite_code TEXT UNIQUE NOT NULL,
      host_family TEXT NOT NULL CHECK (host_family IN ('santhosh', 'rithikha')),
      guest_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      invited_reception BOOLEAN NOT NULL DEFAULT FALSE,
      invited_wedding BOOLEAN NOT NULL DEFAULT FALSE,
      invite_sent BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      invitee_id UUID UNIQUE REFERENCES invitees(id) ON DELETE CASCADE,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 0 AND 20),
      attending_reception BOOLEAN NOT NULL DEFAULT FALSE,
      attending_wedding BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS invitee_id UUID REFERENCES invitees(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS email TEXT`;
  await sql`ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_guest_count_check`;
  await sql`ALTER TABLE rsvps ADD CONSTRAINT rsvps_guest_count_check CHECK (guest_count BETWEEN 0 AND 20)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS rsvps_invitee_id_unique ON rsvps(invitee_id) WHERE invitee_id IS NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS guest_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS guest_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
      s3_key TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      event TEXT NOT NULL DEFAULT 'reception',
      captured_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE guest_photos ADD COLUMN IF NOT EXISTS event TEXT NOT NULL DEFAULT 'reception'`;
  await sql`ALTER TABLE guest_photos ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ`;
  await sql`ALTER TABLE guest_photos DROP CONSTRAINT IF EXISTS guest_photos_event_check`;
  await sql`ALTER TABLE guest_photos ADD CONSTRAINT guest_photos_event_check CHECK (event IN ('engagement', 'reception', 'wedding'))`;
  await sql`CREATE INDEX IF NOT EXISTS guest_photos_profile_id_idx ON guest_photos(profile_id)`;
  await sql`CREATE INDEX IF NOT EXISTS guest_photos_event_idx ON guest_photos(event)`;
};

export const serializeRsvp = (row) => ({
  id: row.id,
  inviteeId: row.invitee_id,
  name: row.guest_name,
  phone: row.phone,
  email: row.email || "",
  guestCount: row.guest_count,
  events: {
    reception: row.attending_reception,
    wedding: row.attending_wedding,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const serializeInvitee = (row) => ({
  id: row.id,
  inviteCode: row.invite_code,
  hostFamily: row.host_family,
  name: row.guest_name,
  phone: row.phone || "",
  email: row.email || "",
  invitedEvents: {
    reception: row.invited_reception,
    wedding: row.invited_wedding,
  },
  inviteSent: row.invite_sent,
  responded: Boolean(row.has_responded),
  respondedAt: row.responded_at || null,
  notes: row.notes || "",
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const serializeProfile = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  createdAt: row.created_at,
});

export const serializePhoto = (row) => ({
  id: row.id,
  profileId: row.profile_id,
  url: row.url,
  caption: row.caption || "",
  event: row.event,
  uploaderName: row.name,
  capturedAt: row.captured_at,
  createdAt: row.created_at,
});

export const handleDatabaseError = (error, response) => {
  console.error(error);

  if (error.code === "DATABASE_URL_MISSING") {
    return response.status(500).json({
      error: "RSVP database is not configured in Vercel yet.",
      code: "DATABASE_URL_MISSING",
    });
  }

  return response.status(500).json({ error: "Something went wrong while reading RSVP data." });
};
