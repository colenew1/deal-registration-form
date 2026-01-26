-- Authentication System Migration
-- Run this in your Supabase SQL Editor after enabling Supabase Auth

-- ============================================
-- 1. Create user_profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Role: 'admin' or 'partner' (guests don't have profiles)
  role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('admin', 'partner')),

  -- Profile info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  tsd_name TEXT,

  -- Link to legacy partners table (for migration/compatibility)
  legacy_partner_id UUID REFERENCES partners(id),

  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Auto-update timestamp trigger (reuse existing function)
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Add auth_user_id to partners table for migration
-- ============================================
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_partners_auth_user_id ON partners(auth_user_id);

-- ============================================
-- 3. Enable RLS on user_profiles
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (non-role fields)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can create profiles (for creating new admins)
CREATE POLICY "Admins can create profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Partners can self-register (insert their own profile)
CREATE POLICY "Allow partner self-registration" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND role = 'partner');

-- ============================================
-- 4. Update deal_registrations RLS policies
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow anonymous inserts" ON deal_registrations;
DROP POLICY IF EXISTS "Allow authenticated reads" ON deal_registrations;
DROP POLICY IF EXISTS "Allow authenticated updates" ON deal_registrations;
DROP POLICY IF EXISTS "Partners can view own submissions" ON deal_registrations;
DROP POLICY IF EXISTS "Partners can insert submissions" ON deal_registrations;

-- Anyone can submit registrations (guest access)
CREATE POLICY "Anyone can submit registrations" ON deal_registrations
  FOR INSERT WITH CHECK (true);

-- Partners can view their own submissions (via legacy_partner_id link)
CREATE POLICY "Partners view own submissions" ON deal_registrations
  FOR SELECT USING (
    partner_id IS NOT NULL AND
    partner_id IN (
      SELECT legacy_partner_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all registrations
CREATE POLICY "Admins view all registrations" ON deal_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any registration
CREATE POLICY "Admins update all registrations" ON deal_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete registrations
CREATE POLICY "Admins delete registrations" ON deal_registrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. Update email_intakes RLS (admin only)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous inserts on email_intakes" ON email_intakes;
DROP POLICY IF EXISTS "Allow reads on email_intakes" ON email_intakes;
DROP POLICY IF EXISTS "Allow updates on email_intakes" ON email_intakes;

-- Admins can manage email_intakes
CREATE POLICY "Admins can view email_intakes" ON email_intakes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update email_intakes" ON email_intakes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow webhook inserts (anonymous for Zapier integration)
CREATE POLICY "Allow webhook inserts" ON email_intakes
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 6. Helper function to check user role
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM user_profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Create first admin user (run manually after creating auth user)
-- ============================================
-- After creating your first admin user in Supabase Auth dashboard:
--
-- INSERT INTO user_profiles (id, role, full_name, email)
-- VALUES (
--   'YOUR_AUTH_USER_UUID_HERE',
--   'admin',
--   'Admin Name',
--   'admin@example.com'
-- );
