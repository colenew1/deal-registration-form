-- Migration: Add deal_name column to both tables
-- Run this in your Supabase SQL Editor

-- Add deal_name to deal_registrations table
ALTER TABLE deal_registrations ADD COLUMN IF NOT EXISTS deal_name TEXT;

-- Add deal_name to email_intakes table
ALTER TABLE email_intakes ADD COLUMN IF NOT EXISTS deal_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN deal_registrations.deal_name IS 'Custom deal name entered by admin when sending to HubSpot';
COMMENT ON COLUMN email_intakes.deal_name IS 'Custom deal name entered by admin when sending to HubSpot';
