-- Mon Frigo - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- If you already ran a previous version, run the CORRECTIVE PATCH at the bottom.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS fridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1E3A5F',
  icon TEXT NOT NULL DEFAULT '❄️',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fridge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fridge_id, user_id)
);

CREATE TABLE IF NOT EXISTS fridge_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fridge_id UUID NOT NULL REFERENCES fridges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE fridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "fridges_member_access" ON fridges;
DROP POLICY IF EXISTS "fridges_insert" ON fridges;
DROP POLICY IF EXISTS "fridges_select" ON fridges;
DROP POLICY IF EXISTS "fridges_owner_modify" ON fridges;

DROP POLICY IF EXISTS "fridge_members_access" ON fridge_members;
DROP POLICY IF EXISTS "fridge_members_insert" ON fridge_members;
DROP POLICY IF EXISTS "fridge_members_select" ON fridge_members;
DROP POLICY IF EXISTS "fridge_members_delete" ON fridge_members;

DROP POLICY IF EXISTS "invitations_access" ON fridge_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON fridge_invitations;
DROP POLICY IF EXISTS "invitations_select" ON fridge_invitations;
DROP POLICY IF EXISTS "invitations_update" ON fridge_invitations;

DROP POLICY IF EXISTS "scan_sessions_access" ON scan_sessions;
DROP POLICY IF EXISTS "scan_sessions_insert" ON scan_sessions;
DROP POLICY IF EXISTS "scan_sessions_select" ON scan_sessions;

DROP POLICY IF EXISTS "scanned_items_access" ON scanned_items;
DROP POLICY IF EXISTS "scanned_items_insert" ON scanned_items;
DROP POLICY IF EXISTS "scanned_items_select" ON scanned_items;
DROP POLICY IF EXISTS "scanned_items_update" ON scanned_items;

-- ============================================================
-- FRIDGES POLICIES
-- ============================================================

-- Any authenticated user can create a fridge (they become owner)
CREATE POLICY "fridges_insert" ON fridges
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only fridge members can read fridges
CREATE POLICY "fridges_select" ON fridges
  FOR SELECT
  USING (
    id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- Only owner can update or delete
CREATE POLICY "fridges_owner_modify" ON fridges
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "fridges_owner_delete" ON fridges
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================
-- FRIDGE MEMBERS POLICIES
-- ============================================================

-- Owners can add members
CREATE POLICY "fridge_members_insert" ON fridge_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM fridge_members WHERE fridge_id = fridge_members.fridge_id AND role = 'owner'
    )
    OR auth.uid() = user_id  -- allow self-insert (when owner creates the fridge)
  );

-- Members can read members of their fridges
CREATE POLICY "fridge_members_select" ON fridge_members
  FOR SELECT
  USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members fm2 WHERE fm2.user_id = auth.uid())
  );

-- Owner can remove members
CREATE POLICY "fridge_members_delete" ON fridge_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM fridge_members fm2 WHERE fm2.fridge_id = fridge_members.fridge_id AND fm2.role = 'owner'
    )
    OR user_id = auth.uid()  -- members can remove themselves
  );

-- ============================================================
-- INVITATIONS POLICIES
-- ============================================================

-- Fridge members can send invitations
CREATE POLICY "invitations_insert" ON fridge_invitations
  FOR INSERT
  WITH CHECK (invited_by = auth.uid());

-- Sender or recipient can view
CREATE POLICY "invitations_select" ON fridge_invitations
  FOR SELECT
  USING (
    invited_by = auth.uid()
    OR invited_email = auth.email()
  );

-- Recipient can update status (accept/decline)
CREATE POLICY "invitations_update" ON fridge_invitations
  FOR UPDATE
  USING (invited_email = auth.email() OR invited_by = auth.uid());

-- ============================================================
-- SCAN SESSIONS POLICIES
-- ============================================================

-- Fridge members can create sessions
CREATE POLICY "scan_sessions_insert" ON scan_sessions
  FOR INSERT
  WITH CHECK (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

-- Fridge members can read sessions
CREATE POLICY "scan_sessions_select" ON scan_sessions
  FOR SELECT
  USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- SCANNED ITEMS POLICIES
-- ============================================================

-- Fridge members can add items
CREATE POLICY "scanned_items_insert" ON scanned_items
  FOR INSERT
  WITH CHECK (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Fridge members can read items
CREATE POLICY "scanned_items_select" ON scanned_items
  FOR SELECT
  USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- Fridge members can update items (consumed, quantity, etc.)
CREATE POLICY "scanned_items_update" ON scanned_items
  FOR UPDATE
  USING (
    fridge_id IN (SELECT fridge_id FROM fridge_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE scanned_items;
