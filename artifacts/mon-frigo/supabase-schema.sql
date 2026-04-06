-- Mon Frigo - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Fridges table
CREATE TABLE IF NOT EXISTS fridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1E3A5F',
  icon TEXT NOT NULL DEFAULT '❄️',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fridge members table (many-to-many: users <-> fridges)
CREATE TABLE IF NOT EXISTS fridge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fridge_id, user_id)
);

-- Fridge invitations table
CREATE TABLE IF NOT EXISTS fridge_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan sessions table
CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scanned items table
CREATE TABLE IF NOT EXISTS scanned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  barcode TEXT,
  product_name TEXT,
  brand TEXT,
  description TEXT,
  image_url TEXT,
  dlc_photo_url TEXT,
  expiry_date DATE,
  purchase_date DATE,
  quantity INTEGER NOT NULL DEFAULT 1,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  consumed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security Policies

ALTER TABLE fridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items ENABLE ROW LEVEL SECURITY;

-- Fridges: only accessible by members
CREATE POLICY "fridges_member_access" ON fridges
  FOR ALL USING (
    id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Fridge members: accessible by members of same fridge
CREATE POLICY "fridge_members_access" ON fridge_members
  FOR ALL USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Invitations: accessible by sender or recipient
CREATE POLICY "invitations_access" ON fridge_invitations
  FOR ALL USING (
    invited_by = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Scan sessions: accessible by fridge members
CREATE POLICY "scan_sessions_access" ON scan_sessions
  FOR ALL USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Scanned items: accessible by fridge members
CREATE POLICY "scanned_items_access" ON scanned_items
  FOR ALL USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Enable Realtime for scanned_items
ALTER PUBLICATION supabase_realtime ADD TABLE scanned_items;
