-- Fix partner RLS policies to match by email in addition to partner_id
-- Previously, partners could only see deal_registrations where partner_id
-- matched their legacy_partner_id, which excluded deals submitted while
-- logged out or by someone else using the same ta_email.

-- ============================================
-- 1. Fix deal_registrations SELECT for partners
-- ============================================

-- Drop the broken legacy_partner_id-based policy
DROP POLICY IF EXISTS "Partners view own submissions" ON deal_registrations;

-- New policy: partners can view deals where:
--   a) partner_id matches their user ID, OR
--   b) ta_email (case-insensitive) matches their profile email
CREATE POLICY "Partners view own submissions" ON deal_registrations
  FOR SELECT USING (
    (partner_id = auth.uid())
    OR
    (LOWER(ta_email) = LOWER((SELECT email FROM user_profiles WHERE id = auth.uid())))
  );

-- ============================================
-- 2. Allow partners to read their email_intakes
-- ============================================

-- Partners can view email_intakes where extracted_ta_email matches their profile email
CREATE POLICY "Partners view own email intakes" ON email_intakes
  FOR SELECT USING (
    LOWER(extracted_ta_email) = LOWER((SELECT email FROM user_profiles WHERE id = auth.uid()))
  );
