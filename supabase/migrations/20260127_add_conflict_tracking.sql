-- Migration: Add conflict tracking fields to email_intakes table
-- Run this in Supabase SQL Editor or via CLI

-- Add conflict tracking columns
ALTER TABLE email_intakes
ADD COLUMN IF NOT EXISTS admin_edited_fields JSONB,
ADD COLUMN IF NOT EXISTS admin_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_to_partner_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_to_partner_email TEXT,
ADD COLUMN IF NOT EXISTS partner_submitted_values JSONB,
ADD COLUMN IF NOT EXISTS has_conflicts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conflicts JSONB,
ADD COLUMN IF NOT EXISTS conflicts_resolved_at TIMESTAMP WITH TIME ZONE;

-- Add index for quick filtering by conflicts
CREATE INDEX IF NOT EXISTS idx_email_intakes_has_conflicts
ON email_intakes(has_conflicts)
WHERE has_conflicts = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN email_intakes.admin_edited_fields IS 'Snapshot of field values when admin sent to partner for conflict detection';
COMMENT ON COLUMN email_intakes.partner_submitted_values IS 'Values submitted by partner through the form';
COMMENT ON COLUMN email_intakes.has_conflicts IS 'True if partner submitted values that conflict with admin edits';
COMMENT ON COLUMN email_intakes.conflicts IS 'Array of {field, admin_value, partner_value} for each conflicting field';
