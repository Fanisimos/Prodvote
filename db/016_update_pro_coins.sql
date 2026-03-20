-- 016: Update Pro tier monthly coins from 300 to 600

CREATE OR REPLACE FUNCTION get_monthly_coins(user_tier TEXT)
RETURNS INT AS $$
BEGIN
  CASE user_tier
    WHEN 'pro' THEN RETURN 600;
    WHEN 'ultra' THEN RETURN 1000;
    WHEN 'legendary' THEN RETURN 2500;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
