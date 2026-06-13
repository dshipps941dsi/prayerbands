-- Server-side rate limiting backed by Postgres (works across Vercel serverless
-- instances, unlike in-memory counters). One row per (key) = per identifier+action,
-- e.g. 'claim:1.2.3.4'. check_rate_limit() atomically increments the bucket,
-- resets it when its window has elapsed, and returns whether the caller is allowed.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Returns TRUE if the request is within the limit, FALSE if it should be blocked.
-- Single upsert = atomic under concurrency (row is locked on conflict).
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_max INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count  INTEGER;
  v_now    TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO rate_limit_buckets (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN v_now - rate_limit_buckets.window_start > make_interval(secs => p_window_seconds) THEN 1
      ELSE rate_limit_buckets.count + 1
    END,
    window_start = CASE
      WHEN v_now - rate_limit_buckets.window_start > make_interval(secs => p_window_seconds) THEN v_now
      ELSE rate_limit_buckets.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;
