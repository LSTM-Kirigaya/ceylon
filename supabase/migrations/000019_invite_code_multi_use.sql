-- Upgrade invite_codes to support validity presets and multi-use counters.

ALTER TABLE public.invite_codes
ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
ADD COLUMN IF NOT EXISTS remaining_uses integer NOT NULL DEFAULT 1 CHECK (remaining_uses >= 0);

CREATE INDEX IF NOT EXISTS idx_invite_codes_remaining_uses ON public.invite_codes (remaining_uses);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON public.invite_codes (expires_at);

-- Backfill existing single-use rows.
UPDATE public.invite_codes
SET
  max_uses = 1,
  remaining_uses = CASE
    WHEN used_by IS NULL THEN 1
    ELSE 0
  END
WHERE max_uses IS NULL OR remaining_uses IS NULL;

-- Atomic consumption to avoid race conditions.
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text, p_user_id uuid)
RETURNS TABLE(ok boolean, reason text) AS $$
DECLARE
  v_id uuid;
  v_remaining integer;
  v_expires timestamptz;
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN QUERY SELECT false, 'missing_code';
    RETURN;
  END IF;

  -- Lock row for safe decrement.
  SELECT id, remaining_uses, expires_at
  INTO v_id, v_remaining, v_expires
  FROM public.invite_codes
  WHERE code = upper(btrim(p_code))
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found';
    RETURN;
  END IF;

  IF v_expires IS NOT NULL AND v_expires < now() THEN
    RETURN QUERY SELECT false, 'expired';
    RETURN;
  END IF;

  IF v_remaining IS NULL OR v_remaining <= 0 THEN
    RETURN QUERY SELECT false, 'exhausted';
    RETURN;
  END IF;

  UPDATE public.invite_codes
  SET remaining_uses = v_remaining - 1
  WHERE id = v_id;

  IF v_remaining - 1 <= 0 THEN
    DELETE FROM public.invite_codes WHERE id = v_id;
  END IF;

  RETURN QUERY SELECT true, null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

