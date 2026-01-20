-- Email Intake Migration for Deal Registration Form
-- Run this in your Supabase SQL Editor AFTER the main schema
-- This adds support for email forwarding intake via Zapier

-- =============================================================================
-- EMAIL INTAKES TABLE
-- Stores parsed email data before it's reviewed and converted to a registration
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Processing status: pending (new), reviewed (user has seen it), converted (became a registration)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'converted', 'discarded')),
  converted_registration_id UUID REFERENCES deal_registrations(id),
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Original email data (from Zapier)
  email_from TEXT,
  email_from_name TEXT,
  email_to TEXT,
  email_subject TEXT,
  email_body_plain TEXT,
  email_body_html TEXT,
  email_date TIMESTAMP WITH TIME ZONE,
  email_message_id TEXT,

  -- Raw payload from Zapier (for debugging)
  raw_payload JSONB,

  -- Parsed/extracted fields with confidence scores
  -- These are our best guesses from parsing the email
  parsed_data JSONB DEFAULT '{}',

  -- Individual extracted fields (denormalized for easy querying)
  -- Partner/TA (Trusted Advisor) Information
  extracted_ta_full_name TEXT,
  extracted_ta_email TEXT,
  extracted_ta_phone TEXT,
  extracted_ta_company_name TEXT,

  -- TSD (Technology Service Distributor) Information
  extracted_tsd_name TEXT,
  extracted_tsd_contact_name TEXT,
  extracted_tsd_contact_email TEXT,

  -- Customer/End-user Information
  extracted_customer_first_name TEXT,
  extracted_customer_last_name TEXT,
  extracted_customer_company_name TEXT,
  extracted_customer_email TEXT,
  extracted_customer_phone TEXT,
  extracted_customer_job_title TEXT,
  extracted_customer_street_address TEXT,
  extracted_customer_city TEXT,
  extracted_customer_state TEXT,
  extracted_customer_postal_code TEXT,
  extracted_customer_country TEXT,

  -- Opportunity Details
  extracted_agent_count TEXT,
  extracted_implementation_timeline TEXT,
  extracted_solutions_interested TEXT[],
  extracted_opportunity_description TEXT,
  extracted_deal_value TEXT,

  -- Confidence scores (0-100) for key fields
  confidence_scores JSONB DEFAULT '{}',

  -- Notes from reviewers
  review_notes TEXT,
  reviewed_by TEXT
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_intakes_status ON email_intakes(status);
CREATE INDEX IF NOT EXISTS idx_email_intakes_created_at ON email_intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_intakes_email_from ON email_intakes(email_from);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_email_intakes_updated_at
  BEFORE UPDATE ON email_intakes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE email_intakes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from API (for webhook)
CREATE POLICY "Allow anonymous inserts on email_intakes" ON email_intakes
  FOR INSERT WITH CHECK (true);

-- Policy: Allow reads (for admin and pre-fill page)
CREATE POLICY "Allow reads on email_intakes" ON email_intakes
  FOR SELECT USING (true);

-- Policy: Allow updates (for marking as reviewed/converted)
CREATE POLICY "Allow updates on email_intakes" ON email_intakes
  FOR UPDATE USING (true);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE email_intakes IS 'Stores parsed email data from Zapier webhook before review and conversion to deal registrations';

COMMENT ON COLUMN email_intakes.status IS 'Processing status: pending (new), reviewed (user has seen), converted (became registration), discarded';
COMMENT ON COLUMN email_intakes.parsed_data IS 'Full parsed data as JSON including all extraction attempts and confidence scores';
COMMENT ON COLUMN email_intakes.confidence_scores IS 'Confidence scores (0-100) for each extracted field, helps UI highlight uncertain extractions';
COMMENT ON COLUMN email_intakes.raw_payload IS 'Original Zapier webhook payload for debugging and re-processing if needed';
