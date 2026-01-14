-- Deal Registration Form - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Main registrations table
CREATE TABLE deal_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status: pending, approved, rejected
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Assigned AE (on approval)
  assigned_ae_name TEXT,
  assigned_ae_email TEXT,

  -- Customer Info
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_job_title TEXT,
  customer_company_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_street_address TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_postal_code TEXT,
  customer_country TEXT,
  agent_count TEXT,
  implementation_timeline TEXT,
  solutions_interested TEXT[], -- Array of solutions
  opportunity_description TEXT,

  -- Partner Info (TA = Trusted Advisor, e.g., SHI, ATC)
  ta_full_name TEXT NOT NULL,
  ta_email TEXT NOT NULL,
  ta_phone TEXT,
  ta_company_name TEXT NOT NULL,

  -- TSD Info (Technology Service Distributor - e.g., Avant)
  tsd_name TEXT NOT NULL,
  tsd_contact_name TEXT,
  tsd_contact_email TEXT,

  -- Source tracking
  source TEXT DEFAULT 'form' CHECK (source IN ('form', 'email_import')),
  original_email_content TEXT,

  -- Webhook tracking
  webhook_sent_at TIMESTAMP WITH TIME ZONE,
  webhook_response TEXT
);

-- Sales Reps table (formerly account_executives)
CREATE TABLE sales_reps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

-- Insert default Sales Reps
INSERT INTO sales_reps (name, email) VALUES
  ('Oliver Gohring', 'ogohring@amplifai.com'),
  ('Curt Tilly', 'ctilly@amplifai.com');

-- Known Partners for fuzzy matching (formerly known_tsds)
CREATE TABLE known_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  email_domains TEXT[] -- Array of domains like ['goavant.net', 'avant.net']
);

-- Insert known Partners
INSERT INTO known_partners (name, email_domains) VALUES
  ('Avant', ARRAY['goavant.net', 'avant.net']),
  ('Telarus', ARRAY['telarus.com']),
  ('Intelisys', ARRAY['intelisys.com']),
  ('Sandler Partners', ARRAY['sandlerpartners.com']),
  ('AppSmart', ARRAY['appsmart.com']);

-- Index for faster queries
CREATE INDEX idx_registrations_status ON deal_registrations(status);
CREATE INDEX idx_registrations_created_at ON deal_registrations(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deal_registrations_updated_at
  BEFORE UPDATE ON deal_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (optional but recommended)
-- Enable RLS
ALTER TABLE deal_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_partners ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts for form submissions
CREATE POLICY "Allow anonymous inserts" ON deal_registrations
  FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated reads (for admin)
CREATE POLICY "Allow authenticated reads" ON deal_registrations
  FOR SELECT USING (true);

-- Policy: Allow authenticated updates (for admin approve/reject)
CREATE POLICY "Allow authenticated updates" ON deal_registrations
  FOR UPDATE USING (true);

-- Policy: Allow reads on sales_reps
CREATE POLICY "Allow reads on sales_reps" ON sales_reps
  FOR SELECT USING (true);

-- Policy: Allow reads on known_partners
CREATE POLICY "Allow reads on known_partners" ON known_partners
  FOR SELECT USING (true);
