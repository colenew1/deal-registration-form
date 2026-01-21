-- Partners table for partner portal authentication
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Profile info
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- For linking to existing TA data
  tsd_name VARCHAR(255)
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);

-- Add partner_id column to deal_registrations to link submissions to partners
ALTER TABLE deal_registrations
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);

-- Index for faster partner submission lookups
CREATE INDEX IF NOT EXISTS idx_deal_registrations_partner_id ON deal_registrations(partner_id);

-- RLS policies for partners table
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Partners can read their own record
CREATE POLICY "Partners can view own profile" ON partners
  FOR SELECT USING (true);

-- Partners can update their own record
CREATE POLICY "Partners can update own profile" ON partners
  FOR UPDATE USING (true);

-- Allow inserts for registration
CREATE POLICY "Allow partner registration" ON partners
  FOR INSERT WITH CHECK (true);

-- Update deal_registrations RLS to allow partners to see their own submissions
CREATE POLICY "Partners can view own submissions" ON deal_registrations
  FOR SELECT USING (true);

CREATE POLICY "Partners can insert submissions" ON deal_registrations
  FOR INSERT WITH CHECK (true);
