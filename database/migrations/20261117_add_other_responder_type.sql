ALTER TABLE responders
  DROP CONSTRAINT IF EXISTS responders_responder_type_check;

ALTER TABLE responders
  ADD CONSTRAINT responders_responder_type_check
  CHECK (responder_type IN ('police', 'medical', 'fire', 'other'));
