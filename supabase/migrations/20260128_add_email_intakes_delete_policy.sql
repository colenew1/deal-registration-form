-- Add missing DELETE policy for email_intakes table
-- Allows admin users to delete email intake records
CREATE POLICY "Admins delete email_intakes" ON email_intakes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
